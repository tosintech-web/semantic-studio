// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/government/GroupNavigation.test.tsx
SUMMARY
    Checks country/government menu roles and manifest-only group selection.
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
afterEach(()=>cleanup());
it('lists countries and government groups separately without graph requests',()=>{
 const country=opened('countries-v1','prj-111111111111').project;
 const government=opened('government-organizations-v1','prj-222222222222').project;
 const ordinary={...country,id:'prj-333333333333',domainProfile:undefined,name:'Ordinary'};
 const open=vi.fn(),create=vi.fn();
 render(<GroupNavigation projects={[country,government,ordinary]} onOpen={open} onCreate={create} canEdit/>);
 fireEvent.click(screen.getByRole('button',{name:'Countries'}));
 expect(screen.getByRole('button',{name:/Open Synthetic.*111111111111/})).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Open Synthetic.*222222222222/})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Government organizations'}));
 fireEvent.click(screen.getByRole('button',{name:/Open Synthetic.*222222222222/}));
 expect(open).toHaveBeenCalledWith(government.id);expect(create).not.toHaveBeenCalled();
});
it('creates from an empty group list through the shared template callback',()=>{
 const create=vi.fn();render(<GroupNavigation projects={[]} onOpen={vi.fn()} onCreate={create} canEdit/>);
 fireEvent.click(screen.getByRole('button',{name:'Countries'}));
 fireEvent.click(screen.getByRole('button',{name:'Create country group'}));expect(create).toHaveBeenLastCalledWith('countries');
 fireEvent.click(screen.getByRole('button',{name:'Government organizations'}));
 fireEvent.click(screen.getByRole('button',{name:'Create government organization group'}));expect(create).toHaveBeenLastCalledWith('government-organizations');
});
it('lets viewers open groups while refusing creation',()=>{
 const project=opened('countries-v1').project,open=vi.fn(),create=vi.fn();
 render(<GroupNavigation projects={[project]} onOpen={open} onCreate={create} canEdit={false}/>);
 fireEvent.click(screen.getByRole('button',{name:'Countries'}));
 const button=screen.getByRole('button',{name:'Create country group'});expect(button.getAttribute('aria-disabled')).toBe('true');fireEvent.click(button);
 fireEvent.click(screen.getByRole('button',{name:/Open Synthetic/}));expect(open).toHaveBeenCalledWith(project.id);expect(create).not.toHaveBeenCalled();
});
it('pages all manifest groups and searches by exact identifier as well as name',()=>{
 const projects=Array.from({length:51},(_,i)=>opened('countries-v1',`prj-${i.toString(16).padStart(12,'0')}`).project);
 render(<GroupNavigation projects={projects} onOpen={vi.fn()} onCreate={vi.fn()} canEdit/>);
 fireEvent.click(screen.getByRole('button',{name:'Countries'}));
 expect(screen.getAllByRole('button',{name:/Open Synthetic/})).toHaveLength(50);
 expect(screen.getByText('50 shown of 51 groups')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Next page'}));expect(screen.getAllByRole('button',{name:/Open Synthetic/})).toHaveLength(1);
 fireEvent.change(screen.getByLabelText('Search groups'),{target:{value:projects[50].id}});
 expect(screen.getByText('1 shown of 1 groups')).toBeTruthy();
});
