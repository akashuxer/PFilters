// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArvoMessageThread } from './MessageThread';

afterEach(() => { document.body.innerHTML = ''; });

describe('ArvoMessageThread', () => {
  it('composes ArvoAvatar and o9con actions for a current-user message', () => {
    const host = document.createElement('div');
    document.body.append(host);
    ArvoMessageThread.initialize(host, { messages: [{ id: 'mine', author: 'Taylor Kim', initials: 'TK', text: 'Please update the empty state.', isCurrentUser: true }] });
    expect(host.querySelector('.arvo-avt')).not.toBeNull();
    expect(host.querySelector('.o9con-comment-add')).not.toBeNull();
    expect(host.querySelector('.o9con-edit')).not.toBeNull();
    expect(host.querySelector('.o9con-delete')).not.toBeNull();
  });

  it('submits replies and emits a native message event', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const onMessage = vi.fn();
    const thread = ArvoMessageThread.initialize(host, { messages: [{ id: 'source', author: 'Maya Patel', initials: 'MP', text: 'Could this be clearer?' }], onMessage });
    (host.querySelector('.arvo-msg-thread__action') as HTMLButtonElement).click();
    const input = host.querySelector<HTMLTextAreaElement>('.arvo-msg-thread__reply-composer textarea')!;
    input.value = 'Yes, I will revise it.';
    input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(onMessage).toHaveBeenCalledWith({ message: 'Yes, I will revise it.', parentId: 'source' });
    expect(host.textContent).toContain('Yes, I will revise it.');
    thread.destroy();
  });
});
