import {describe, expect, it} from "vitest";
import {SpanRegistry} from "@/telemetry/spans.ts";
import type {TimingSnapshotDTO} from "@/telemetry/dto.ts";
import type {Clock} from "@/telemetry/types.ts";

const TASK = {pairsCode: "PPL-XPL_042", sampleId: "S17"};

// Wall and monotonic advance independently so a clock jump can be simulated.
class FakeClock implements Clock {
    private monotonic = 1_000;
    private wall = 1_700_000_000_000;

    monotonicMs(): number {
        return this.monotonic;
    }

    wallMs(): number {
        return this.wall;
    }

    tick(ms: number): void {
        this.monotonic += ms;
        this.wall += ms;
    }

    jumpWallClock(ms: number): void {
        this.wall += ms;
    }
}

function newRegistry(): {registry: SpanRegistry; clock: FakeClock} {
    const clock = new FakeClock();
    return {registry: new SpanRegistry(clock, "session-1"), clock};
}

function totalMs(intervals: {durationMs: number}[]): number {
    return intervals.reduce((sum, interval) => sum + interval.durationMs, 0);
}

describe("task intervals", () => {
    it("does not start counting until the annotator acts", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        clock.tick(30_000);

        expect(totalMs(registry.snapshot()!.task.intervals)).toBe(0);

        registry.recordInteraction("geometry.point");
        clock.tick(5_000);
        expect(totalMs(registry.snapshot()!.task.intervals)).toBe(5_000);
    });

    it("treats viewing as free and working as resuming", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.recordInteraction("geometry.point");
        clock.tick(4_000);
        registry.suspend("hidden");

        clock.tick(600_000);
        registry.recordInteraction("tool.select");
        clock.tick(10_000);
        expect(totalMs(registry.snapshot()!.task.intervals)).toBe(4_000);

        registry.recordInteraction("geometry.polygon");
        clock.tick(2_000);
        expect(totalMs(registry.snapshot()!.task.intervals)).toBe(6_000);
    });

    it("counts a lighting-variant switch as work", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.recordInteraction("variant.switch");
        clock.tick(3_000);
        expect(totalMs(registry.snapshot()!.task.intervals)).toBe(3_000);
    });
});

describe("object spans", () => {
    it("binds a provisional span to the id SAM assigns later", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.point");
        clock.tick(2_000);
        registry.recordInteraction("model.sam-result");
        registry.bindProvisionalObject(42);
        clock.tick(3_000);
        registry.commitObject(42);

        const mask = registry.snapshot()!.masks[42];
        expect(totalMs(mask.intervals)).toBe(5_000);
        expect(mask.counts["geometry.point"]).toBe(1);
        expect(mask.committedAt).toBeDefined();
    });

    it("charges selection nothing until the first action", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.polygon");
        registry.bindProvisionalObject(7);
        clock.tick(1_000);
        registry.commitObject(7);

        registry.selectObject(7);
        clock.tick(60_000);
        expect(totalMs(registry.snapshot()!.masks[7].intervals)).toBe(1_000);

        registry.recordInteraction("geometry.vertex-move");
        clock.tick(4_000);
        registry.commitObject(7);
        expect(totalMs(registry.snapshot()!.masks[7].intervals)).toBe(5_000);
    });

    it("keeps interleaved edits on their own spans", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);

        for (const id of [1, 2]) {
            registry.beginProvisionalObject();
            registry.recordInteraction("geometry.polygon");
            registry.bindProvisionalObject(id);
            clock.tick(1_000);
            registry.commitObject(id);
        }

        registry.selectObject(1);
        registry.recordInteraction("geometry.vertex-move");
        clock.tick(7_000);
        registry.commitObject(1);

        const {masks} = registry.snapshot()!;
        expect(totalMs(masks[1].intervals)).toBe(8_000);
        expect(totalMs(masks[2].intervals)).toBe(1_000);
        expect(masks[1].intervals).toHaveLength(2);
    });

    it("keeps a deleted object's time under discarded", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.point");
        registry.bindProvisionalObject(9);
        clock.tick(12_000);
        registry.deleteObject(9);

        const snapshot = registry.snapshot()!;
        expect(snapshot.masks[9]).toBeUndefined();
        expect(snapshot.task.discarded).toHaveLength(1);
        expect(snapshot.task.discarded[0].objectKey).toBe(9);
        expect(totalMs(snapshot.task.discarded[0].intervals)).toBe(12_000);
    });

    it("records a span begun and never committed as abandoned", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.freeform");
        clock.tick(3_000);
        registry.abandonProvisionalObject();

        const {discarded} = registry.snapshot()!.task;
        expect(discarded).toHaveLength(1);
        expect(discarded[0].objectKey).toBeNull();
        expect(discarded[0].intervals.at(-1)?.reason).toBe("abandoned");
    });
});

describe("interactions", () => {
    it("flags the action that follows an undo as a correction", () => {
        const {registry} = newRegistry();
        registry.openTask(TASK);
        registry.recordInteraction("geometry.point");
        registry.recordInteraction("undo");
        registry.recordInteraction("geometry.polygon");
        registry.recordInteraction("geometry.bbox");

        const {events} = registry.snapshot()!.task;
        expect(events.map((event) => event.correction)).toEqual([
            undefined,
            undefined,
            true,
            undefined,
        ]);
    });

    it("counts task interactions including those charged to an object", () => {
        const {registry} = newRegistry();
        registry.openTask(TASK);
        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.point");
        registry.recordInteraction("geometry.point");
        registry.bindProvisionalObject(3);
        registry.recordInteraction("tool.select");

        const snapshot = registry.snapshot()!;
        expect(snapshot.task.counts["geometry.point"]).toBe(2);
        expect(snapshot.task.counts["tool.select"]).toBe(1);
        expect(snapshot.masks[3].counts["geometry.point"]).toBe(2);
        expect(snapshot.masks[3].counts["tool.select"]).toBe(1);
    });
});

describe("stored durations", () => {
    it("writes totalMs on every span, matching the intervals", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.point");
        registry.bindProvisionalObject(4);
        clock.tick(6_000);
        registry.commitObject(4);
        clock.tick(30_000);

        const snapshot = registry.snapshot()!;
        expect(snapshot.masks[4].totalMs).toBe(6_000);
        expect(snapshot.masks[4].totalMs).toBe(
            totalMs(snapshot.masks[4].intervals),
        );
        expect(snapshot.task.totalMs).toBe(totalMs(snapshot.task.intervals));
    });

    it("splits task time into object work and overhead", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);

        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.point");
        registry.bindProvisionalObject(1);
        clock.tick(5_000);
        registry.commitObject(1);

        // Between grains: work on the task, charged to no object.
        registry.recordInteraction("variant.switch");
        clock.tick(2_000);
        registry.suspend("blur");

        const {task} = registry.snapshot()!;
        expect(task.objectsTotalMs).toBe(5_000);
        expect(task.overheadMs).toBe(2_000);
        expect(task.totalMs).toBe(task.objectsTotalMs + task.overheadMs);
    });

    it("counts a discarded object's time as object work, not overhead", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.point");
        registry.bindProvisionalObject(2);
        clock.tick(8_000);
        registry.deleteObject(2);
        registry.suspend("blur");

        const {task} = registry.snapshot()!;
        expect(task.objectsTotalMs).toBe(8_000);
        expect(task.overheadMs).toBe(0);
    });
});

describe("going idle", () => {
    it("ends the interval at the last input, not when the timer noticed", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.recordInteraction("geometry.point");
        clock.tick(30_000);

        // The threshold elapses; the check runs late, on the next heartbeat.
        const lastInputMonotonicMs = clock.monotonicMs();
        clock.tick(4 * 60_000 + 12_000);
        registry.suspend("idle", lastInputMonotonicMs);
        registry.recordInteraction("idle.prompted");

        const {task} = registry.snapshot()!;
        expect(totalMs(task.intervals)).toBe(30_000);
        expect(task.intervals.at(-1)?.reason).toBe("idle");
    });

    it("does not reopen the interval when the prompt appears", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.recordInteraction("geometry.point");
        clock.tick(10_000);
        registry.suspend("idle", clock.monotonicMs());
        registry.recordInteraction("idle.prompted");

        clock.tick(120_000);
        expect(totalMs(registry.snapshot()!.task.intervals)).toBe(10_000);
    });

    it("resumes on the annotator answering", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.recordInteraction("geometry.point");
        clock.tick(10_000);
        registry.suspend("idle", clock.monotonicMs());
        registry.recordInteraction("idle.prompted");

        clock.tick(90_000);
        registry.recordInteraction("idle.resumed");
        clock.tick(5_000);

        const {task} = registry.snapshot()!;
        expect(totalMs(task.intervals)).toBe(15_000);
        expect(task.counts["idle.prompted"]).toBe(1);
        expect(task.counts["idle.resumed"]).toBe(1);
    });

    it("gives a grain in progress a longer rope", () => {
        const {registry} = newRegistry();
        registry.openTask(TASK);
        expect(registry.hasObjectInProgress()).toBe(false);

        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.point");
        registry.bindProvisionalObject(1);
        expect(registry.hasObjectInProgress()).toBe(true);

        registry.commitObject(1);
        expect(registry.hasObjectInProgress()).toBe(false);
    });

    it("charges idle time to the grain no more than to the task", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.point");
        registry.bindProvisionalObject(6);
        clock.tick(20_000);

        const lastInputMonotonicMs = clock.monotonicMs();
        clock.tick(8 * 60_000);
        registry.suspend("idle", lastInputMonotonicMs);

        expect(totalMs(registry.snapshot()!.masks[6].intervals)).toBe(20_000);
    });
});

describe("clock behaviour", () => {
    it("measures with the monotonic clock, not the wall clock", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.recordInteraction("geometry.point");
        clock.tick(5_000);
        clock.jumpWallClock(-3_600_000);
        clock.tick(5_000);
        registry.suspend("blur");

        expect(totalMs(registry.snapshot()!.task.intervals)).toBe(10_000);
    });

    it("projects an open interval without closing it", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.recordInteraction("geometry.point");
        clock.tick(4_000);

        const first = registry.snapshot()!.task;
        expect(first.intervals.at(-1)).toMatchObject({
            durationMs: 4_000,
            reason: "open",
        });

        clock.tick(6_000);
        const second = registry.snapshot()!.task;
        expect(second.intervals).toHaveLength(1);
        expect(totalMs(second.intervals)).toBe(10_000);
    });
});

describe("reload and crash", () => {
    it("appends to the same span rather than restarting it", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.beginProvisionalObject();
        registry.recordInteraction("geometry.point");
        registry.bindProvisionalObject(5);
        clock.tick(9_000);
        registry.suspend("session-end");
        const saved = registry.snapshot()!;

        const reopened = new SpanRegistry(clock, "session-2");
        reopened.absorb(saved);
        reopened.openTask(TASK);
        reopened.selectObject(5);
        reopened.recordInteraction("geometry.vertex-move");
        clock.tick(6_000);

        const snapshot = reopened.snapshot()!;
        expect(snapshot.task.spanId).toBe(saved.task.spanId);
        expect(snapshot.task.viewedAt).toBe(saved.task.viewedAt);
        expect(totalMs(snapshot.masks[5].intervals)).toBe(15_000);
        expect(snapshot.task.sessions.map((session) => session.id)).toEqual([
            "session-1",
            "session-2",
        ]);
    });

    it("holds timing that arrives before its task opens", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.recordInteraction("geometry.point");
        clock.tick(3_000);
        const saved = registry.snapshot()!;

        // The batch response is mapped while the previous task is still active.
        const next = new SpanRegistry(clock, "session-2");
        next.openTask({pairsCode: "other", sampleId: "S1"});
        next.absorb(saved);
        expect(next.snapshot()!.task.spanId).not.toBe(saved.task.spanId);

        next.openTask(TASK);
        expect(next.snapshot()!.task.spanId).toBe(saved.task.spanId);
        expect(totalMs(next.snapshot()!.task.intervals)).toBe(3_000);
    });

    it("truncates a crashed session to its last heartbeat", () => {
        const {registry, clock} = newRegistry();
        registry.openTask(TASK);
        registry.recordInteraction("geometry.point");
        clock.tick(20_000);

        // What the heartbeat wrote: an interval still marked open.
        const crashed: TimingSnapshotDTO = registry.snapshot()!;
        const lastHeartbeatWallMs = clock.wallMs();
        expect(crashed.task.intervals.at(-1)?.reason).toBe("open");

        // The machine sleeps for four hours before the next launch.
        clock.tick(4 * 3_600_000);
        const recovered: TimingSnapshotDTO = {
            ...crashed,
            task: {
                ...crashed.task,
                intervals: crashed.task.intervals.map((interval) =>
                    interval.reason === "open"
                        ? {
                              startedAt: interval.startedAt,
                              durationMs: Math.max(
                                  0,
                                  lastHeartbeatWallMs - interval.startedAt,
                              ),
                              reason: "session-end" as const,
                          }
                        : interval,
                ),
            },
        };

        const reopened = new SpanRegistry(clock, "session-2");
        reopened.absorb(recovered);
        reopened.openTask(TASK);
        expect(totalMs(reopened.snapshot()!.task.intervals)).toBe(20_000);
    });
});
