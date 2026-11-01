// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/government/GroupNavigation.test.tsx
SUMMARY
    Checks the three Home tabs, keyboard selection and manifest-only groups.
BASIC IDEA
    Supply project summaries and inspect native navigation without graph APIs.
INPUTS / INPUT SOURCES
    Synthetic profiles, duplicate names, pages and explicit edit permission.
EXPECTED OUTPUT
    Exact identities, complete counts and no write action for viewers.
================================================================================
*/
import {cleanup,fireEvent,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {renderEn as render} from '../testutils/i18n';
import {opened} from '../testutils/government';
import GroupNavigation from './GroupNavigation';
import {I18nProvider} from '../i18n/I18nProvider';
import UiLanguageSelect from '../components/UiLanguageSelect';
afterEach(()=>cleanup());
it('starts on the vocabulary panel and exposes exactly one selected tab',()=>{
 render(<GroupNavigation projects={[]} onOpen={vi.fn()} onCreate={vi.fn()} canEdit>
   <button>Vocabulary content</button>
 </GroupNavigation>);
 const tabs=screen.getAllByRole('tab');
 expect(tabs.map(tab=>tab.textContent)).toEqual(['Countries','Government organizations','Vocabulary & concept models']);
 expect(tabs.map(tab=>tab.getAttribute('aria-selected'))).toEqual(['false','false','true']);
 expect(screen.getByRole('tabpanel',{name:'Vocabulary & concept models'}).contains(screen.getByRole('button',{name:'Vocabulary content'}))).toBe(true);
 fireEvent.click(tabs[0]);
 expect(screen.queryByRole('button',{name:'Vocabulary content'})).toBeNull();
 expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
 expect(screen.getByRole('tabpanel',{name:'Countries'}).id).toBe(tabs[0].getAttribute('aria-controls'));
});
it('moves focus and selection together with arrows, Home and End',()=>{
 render(<GroupNavigation projects={[]} onOpen={vi.fn()} onCreate={vi.fn()} canEdit/>);
 const tabs=screen.getAllByRole('tab');tabs[2].focus();
 for(const [key,index] of [['ArrowRight',0],['ArrowLeft',2],['Home',0],['End',2]] as const){
   fireEvent.keyDown(document.activeElement!,{key});
   expect(document.activeElement).toBe(tabs[index]);
   expect(tabs.filter(tab=>tab.getAttribute('aria-selected')==='true')).toEqual([tabs[index]]);
   expect(tabs.map(tab=>tab.tabIndex)).toEqual(tabs.map((_,i)=>i===index?0:-1));
 }
});
it('shows loading and failures instead of a misleading empty master list',()=>{
 const props={projects:[],onOpen:vi.fn(),onCreate:vi.fn(),canEdit:true};
 const {rerender}=render(<GroupNavigation {...props} loading/>);
 fireEvent.click(screen.getByRole('tab',{name:'Countries'}));
 expect(screen.getByText('Loading your library…')).toBeTruthy();
 expect(screen.queryByText('No matching groups. Create a group to start registering entries.')).toBeNull();
 rerender(<GroupNavigation {...props} error={new Error('Synthetic list failure')}/>);
 expect(screen.getByText('Synthetic list failure')).toBeTruthy();
 expect(screen.queryByText('No matching groups. Create a group to start registering entries.')).toBeNull();
});
it('keeps the selected category and search when the UI language changes',()=>{
 localStorage.removeItem('semantic-studio.uiLocale.v1');
 render(<I18nProvider><UiLanguageSelect/><GroupNavigation projects={[]} onOpen={vi.fn()} onCreate={vi.fn()} canEdit/></I18nProvider>);
 expect(screen.getAllByRole('tab').map(tab=>tab.textContent)).toEqual(['国マスター','組織マスター','語彙・概念モデル']);
 fireEvent.click(screen.getByRole('tab',{name:'国マスター'}));
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Synthetic'}});
 fireEvent.change(screen.getByRole('combobox',{name:'UIの言語'}),{target:{value:'en'}});
 expect(screen.getByRole('tab',{name:'Countries'}).getAttribute('aria-selected')).toBe('true');
 expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Synthetic');
 localStorage.removeItem('semantic-studio.uiLocale.v1');
});
it('blocks group opening and creation while an operation is busy',()=>{
 const open=vi.fn(),create=vi.fn();
 render(<GroupNavigation projects={[opened('countries-v1').project]} onOpen={open} onCreate={create} canEdit busy/>);
 fireEvent.click(screen.getByRole('tab',{name:'Countries'}));
 fireEvent.click(screen.getByRole('button',{name:'Create country group'}));
 fireEvent.click(screen.getByRole('button',{name:/Open Synthetic/}));
 expect(open).not.toHaveBeenCalled();expect(create).not.toHaveBeenCalled();
});
it('lists countries and government groups separately without graph requests',()=>{
 const country=opened('countries-v1','prj-111111111111').project;
 const government=opened('government-organizations-v1','prj-222222222222').project;
 const ordinary={...country,id:'prj-333333333333',domainProfile:undefined,name:'Ordinary'};
 const open=vi.fn(),create=vi.fn();
 render(<GroupNavigation projects={[country,government,ordinary]} onOpen={open} onCreate={create} canEdit/>);
 fireEvent.click(screen.getByRole('tab',{name:'Countries'}));
 expect(screen.getByRole('button',{name:/Open Synthetic.*111111111111/})).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Open Synthetic.*222222222222/})).toBeNull();
 fireEvent.click(screen.getByRole('tab',{name:'Government organizations'}));
 fireEvent.click(screen.getByRole('button',{name:/Open Synthetic.*222222222222/}));
 expect(open).toHaveBeenCalledWith(government.id);expect(create).not.toHaveBeenCalled();
});
it('creates from an empty group list through the shared template callback',()=>{
 const create=vi.fn();render(<GroupNavigation projects={[]} onOpen={vi.fn()} onCreate={create} canEdit/>);
 fireEvent.click(screen.getByRole('tab',{name:'Countries'}));
 fireEvent.click(screen.getByRole('button',{name:'Create country group'}));expect(create).toHaveBeenLastCalledWith('countries');
 fireEvent.click(screen.getByRole('tab',{name:'Government organizations'}));
 fireEvent.click(screen.getByRole('button',{name:'Create government organization group'}));expect(create).toHaveBeenLastCalledWith('government-organizations');
});
it('lets viewers open groups while refusing creation',()=>{
 const project=opened('countries-v1').project,open=vi.fn(),create=vi.fn();
 render(<GroupNavigation projects={[project]} onOpen={open} onCreate={create} canEdit={false}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Countries'}));
 const button=screen.getByRole('button',{name:'Create country group'});expect(button.getAttribute('aria-disabled')).toBe('true');fireEvent.click(button);
 fireEvent.click(screen.getByRole('button',{name:/Open Synthetic/}));expect(open).toHaveBeenCalledWith(project.id);expect(create).not.toHaveBeenCalled();
});
it('pages all manifest groups and searches by exact identifier as well as name',()=>{
 const projects=Array.from({length:51},(_,i)=>opened('countries-v1',`prj-${i.toString(16).padStart(12,'0')}`).project);
 render(<GroupNavigation projects={projects} onOpen={vi.fn()} onCreate={vi.fn()} canEdit/>);
 fireEvent.click(screen.getByRole('tab',{name:'Countries'}));
 expect(screen.getAllByRole('button',{name:/Open Synthetic/})).toHaveLength(50);
 expect(screen.getByText('50 shown of 51 groups')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Next page'}));expect(screen.getAllByRole('button',{name:/Open Synthetic/})).toHaveLength(1);
 fireEvent.change(screen.getByLabelText('Search groups'),{target:{value:projects[50].id}});
 expect(screen.getByText('1 shown of 1 groups')).toBeTruthy();
});
it('returns to a populated page when the last master on the final page is removed',()=>{
 const projects=Array.from({length:51},(_,i)=>opened('countries-v1',`prj-${i.toString(16).padStart(12,'0')}`).project);
 const props={onOpen:vi.fn(),onCreate:vi.fn(),canEdit:true};
 const {rerender}=render(<GroupNavigation {...props} projects={projects}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Countries'}));
 fireEvent.click(screen.getByRole('button',{name:'Next page'}));
 expect(screen.getAllByRole('button',{name:/Open Synthetic/})).toHaveLength(1);
 rerender(<GroupNavigation {...props} projects={projects.slice(0,50)}/>);
 expect(screen.getAllByRole('button',{name:/Open Synthetic/})).toHaveLength(50);
 expect(screen.getByText('50 shown of 50 groups')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Previous page'}).getAttribute('aria-disabled')).toBe('true');
 expect(screen.getByRole('button',{name:'Next page'}).getAttribute('aria-disabled')).toBe('true');
 rerender(<GroupNavigation {...props} projects={projects}/>);
 expect(screen.getAllByRole('button',{name:/Open Synthetic/})).toHaveLength(50);
 expect(screen.getByText('50 shown of 51 groups')).toBeTruthy();
});
