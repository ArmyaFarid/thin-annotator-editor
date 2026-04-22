import PageLayout from '@/layouts/PageLayout.tsx';
import {Toolbar} from '@/common/components/annotator-toolbar/Toolbar.tsx';
import {ImageEditor} from '@/common/components/image/editor/ImageEditor.tsx';
import {AnnotationPanel} from '@/common/components/annotation-panel/AnnotationPanel.tsx';
import FilterGammaSelector from '@/common/components/filter-gamma-selector/FilterGammaSelector.tsx';
import {ZoomPreferenceToggle} from '@/common/components/zoom-preference/ZoomPreferenceToggle.tsx';
import {RestoreDraftBanner} from '@/common/components/restore-draft/RestoreDraftBanner.tsx';
import useAutosaveDraft from '@/app/useAutosaveDraft.ts';
import {t} from "@/i18n/index.ts";

export default function AnnotatorPage() {
    useAutosaveDraft();

    return (
        <PageLayout>
            <RestoreDraftBanner />
            <div className="w-full flex flex-row justify-between items-center">
                <button className="bg-secondary px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">{t("home")}</button>
                <button className="bg-secondary px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">{t("loadImage")}</button>
                <button className="bg-secondary px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">{t("finish")}</button>
            </div>
            <div className="w-full flex flex-row gap-2 items-stretch flex-1 min-h-0">
                <div className="flex-none">
                    <Toolbar />
                </div>

                <div className="flex-1 relative bg-secondary border border-white/20 rounded-md overflow-hidden">
                    <FilterGammaSelector />
                    <ImageEditor />
                    <ZoomPreferenceToggle />
                </div>

                <div className="w-72">
                    <AnnotationPanel />
                </div>
            </div>
        </PageLayout>
    );
}
