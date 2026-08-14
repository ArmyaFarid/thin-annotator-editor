/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Modified by Farid, 2026-01-18:
 * - Add image segmentation only page
 */

import "@/assets/scss/App.scss";
import ErrorReport from "@/common/error/ErrorReport";
import AppErrorFallback from "@/app/AppErrorFallback";
import AppSuspenseFallback from "@/app/AppSuspenseFallback";
import RelayEnvironmentProvider from "@/graphql/RelayEnvironmentProvider";
import RootLayout from "@/layouts/RootLayout";
import AnnotatorPage from "@/pages/annotator/AnnotatorPageWrapper.tsx";
import HomePage from "@/pages/home/home-page.tsx";
import PageNotFoundPage from "@/routes/PageNotFoundPage";
import useSettingsContext from "@/settings/useSettingsContext";
import useLoadAnnotationOptions from "@/app/useLoadAnnotationOptions.ts";
import {useAtomValue} from "jotai";
import {langAtom} from "@/app/atom.ts";
import {Route, Routes} from "react-router-dom";
import {Toaster} from "sonner";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export default function AppWrapper() {
    const {settings} = useSettingsContext();
    useLoadAnnotationOptions();
    // Subscribing here is what repaints the whole tree on a language change,
    // so every `t()` below re-runs with the new language.
    useAtomValue(langAtom);
    return (
        <RelayEnvironmentProvider
            endpoint={settings.videoAPIEndpoint}
            suspenseFallback={<AppSuspenseFallback />}
            errorFallback={AppErrorFallback}>
            <TooltipPrimitive.Provider
                delayDuration={800}
                skipDelayDuration={600}>
                <Toaster richColors position="top-right" />
                <AppRoutes />
            </TooltipPrimitive.Provider>
        </RelayEnvironmentProvider>
    );
}

function AppRoutes() {
    return (
        <>
            <Routes>
                <Route element={<RootLayout />}>
                    <Route index={true} element={<HomePage />} />
                    <Route
                        path="annotate/:pairsCode/:sampleId"
                        element={<AnnotatorPage />}
                    />
                    <Route path="*" element={<PageNotFoundPage />} />
                </Route>
            </Routes>
            <ErrorReport />
        </>
    );
}
