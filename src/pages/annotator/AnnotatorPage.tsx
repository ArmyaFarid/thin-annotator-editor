import PageLayout from '@/layouts/PageLayout.tsx';
import {Toolbar} from '@/common/components/annotator-toolbar/Toolbar.tsx';
import {ImageEditor} from '@/common/components/image/editor/ImageEditor.tsx';
import MaskList from '@/common/components/image/editor/maskView/MaskList.tsx';
import FilterGammaSelector from '@/common/components/filter-gamma-selector/FilterGammaSelector.tsx';
import {ZoomPreferenceToggle} from '@/common/components/zoom-preference/ZoomPreferenceToggle.tsx';

export default function AnnotatorPage() {
    return (
        <PageLayout>
            <div className="w-full flex flex-row justify-between items-center">
                <button className="bg-secondary px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">Accueil</button>
                <button className="bg-secondary px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">Charger une image</button>
                <button className="bg-secondary px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">Terminer</button>
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

                <div className="w-80 bg-secondary border border-white/20 p-2 rounded-md">
                    <MaskList />
                </div>
            </div>
        </PageLayout>
    );
}
