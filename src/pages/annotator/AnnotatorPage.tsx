import PageLayout from '@/layouts/PageLayout.tsx';
import {Toolbar} from '@/common/components/annotator-toolbar/Toolbar.tsx';
import {ImageEditor} from '@/common/components/image/editor/ImageEditor.tsx';
import MaskList from '@/common/components/image/editor/maskView/MaskList.tsx';
import FilterGammaSelector from '@/common/components/filter-gamma-selector/FilterGammaSelector.tsx';

export default function AnnotatorPage() {
    return (
        <PageLayout>
            <div className="w-full flex flex-row justify-between items-center">
                <div className="bg-secondary p-2 rounded-md">Accueil</div>
                <div className="bg-secondary p-2 rounded-md">Charger une image</div>
                <div className="bg-secondary p-2 rounded-md">Terminer</div>
            </div>
            <div className="w-full flex flex-row gap-2 items-stretch h-full">
                <div className="flex-none">
                    <Toolbar />
                </div>

                <div className="flex-1 h-full bg-secondary border border-white/20 rounded-md flex flex-col">
                    <FilterGammaSelector />
                    <div className="flex-1 flex justify-center items-center overflow-hidden">
                        <ImageEditor />
                    </div>
                </div>

                <div className="w-80 h-full bg-secondary border border-white/20 p-2 rounded-md">
                    <MaskList />
                </div>
            </div>
        </PageLayout>
    );
}
