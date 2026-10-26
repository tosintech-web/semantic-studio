// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/team/LoginPanel.test.tsx
SUMMARY
    Fixed callback failure flags render in the current interface language.
BASIC IDEA
    Only the finite auth=failed outcome selects a typed sentence; provider
    query text never becomes rendered content.
INPUTS / INPUT SOURCES
    Synthetic callback URL and the saved Japanese/English interface locale.
EXPECTED OUTPUT
    Safe localized sign-in failure feedback in the callback popup.
================================================================================
*/
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {I18nProvider} from '../i18n/I18nProvider';
import {LoginPanel} from './LoginPanel';
vi.mock('../api',()=>({loginTeam:vi.fn()}));
afterEach(()=>{cleanup();window.history.replaceState(null,'','/');});
describe('callback login failure',()=>{
 it.each([
  ['en','Sign-in failed. Please try again.'],
  ['ja','ログインできませんでした。もう一度お試しください。'],
 ])('renders the fixed failure outcome in %s', (locale,message)=>{
  localStorage.setItem('semantic-studio.uiLocale.v1',locale);
  window.history.replaceState(null,'','/?auth=failed&provider_error=untrusted-secret');
  render(<I18nProvider><LoginPanel refresh={async()=>{}}/></I18nProvider>);
  expect(screen.getByRole('alert').textContent).toBe(message);
  expect(screen.queryByText('untrusted-secret')).toBeNull();
 });
 it('does not render arbitrary query text as an authentication failure',()=>{
  window.history.replaceState(null,'','/?auth=untrusted-secret');
  render(<LoginPanel refresh={async()=>{}}/>);
  expect(screen.queryByRole('alert')).toBeNull();
 });
});
