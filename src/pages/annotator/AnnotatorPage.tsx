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
import {VideoData} from '@/demo/atoms.ts';

import {Location, useLocation} from 'react-router-dom';
import {useEffect} from 'react';
import PageLayout from '@/layouts/PageLayout.tsx';
import {Toolbar} from '@/common/components/annotator-toolbar/Toolbar.tsx';
import useAnnotatorToolbar from '@/common/components/annotator-toolbar/useAnnotatorToolbar.ts';
import {ImageEditor} from '@/common/components/image/editor/ImageEditor.tsx';
import MaskList from '@/common/components/image/editor/maskView/MaskList.tsx';

type LocationState = {
  video?: VideoData;
};

export default function AnnotatorPage() {
  const {state} = useLocation() as Location<LocationState>;
  // const [activeTool, setActiveTool] = useState<Tool>('select-add');

  const [activeTool] = useAnnotatorToolbar();

  useEffect(() => {
    console.log(activeTool);
  }, [activeTool]);

  return (
    <PageLayout>
      <div className="w-full flex flex-row justify-between items-center">
        <div className="bg-secondary p-2 rounded-md">Accueil</div>
        <div className="bg-secondary p-2 rounded-md"> Charger une image </div>
        <div className="bg-secondary p-2 rounded-md"> Terminer </div>
      </div>
      <div className="w-full flex flex-row gap-2 items-stretch h-full">
        {/*<Toolbar value={activeTool} onChange={setActiveTool} />*/}

        <div className="flex-none">
          <Toolbar />
        </div>

        {/* Image area (main) */}
        <div className="flex-1 h-full bg-secondary border border-white/20 rounded-md flex justify-center items-center">
          {/* image area */}
          <ImageEditor />
        </div>

        {/* Annotation box */}
        <div className="w-80 h-full bg-secondary border border-white/20 p-2 rounded-md">
          {/* annotation box */}
          <MaskList />
        </div>
      </div>
    </PageLayout>
  );
}
