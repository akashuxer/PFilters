import { ArvoAvatar } from '../Avatar';

export type ArvoMessageThreadReaction = 'heart' | 'thumbs-up' | 'celebrate';

export interface ArvoMessageThreadMessage {
  id: string;
  author: string;
  initials: string;
  text: string;
  timestamp?: string;
  role?: string;
  avatarSrc?: string;
  avatarAlt?: string;
  replies?: ArvoMessageThreadMessage[];
  reactions?: Partial<Record<ArvoMessageThreadReaction, number>>;
  isCurrentUser?: boolean;
}

export interface ArvoMessageThreadOptions {
  messages?: ArvoMessageThreadMessage[];
  currentUser?: { name: string; initials: string; avatarSrc?: string; avatarAlt?: string };
  heading?: string;
  subtitle?: string;
  allowResolve?: boolean;
  initiallyResolved?: boolean;
  onMessage?: (detail: { message: string; parentId: string | null }) => void;
  onMessageEdit?: (message: ArvoMessageThreadMessage) => void;
  onMessageDelete?: (message: ArvoMessageThreadMessage) => void;
  onResolvedChange?: (resolved: boolean) => void;
}

const REACTIONS: ReadonlyArray<{ type: ArvoMessageThreadReaction; icon: string; label: string }> = [
  { type: 'heart', icon: 'heart', label: 'Heart' },
  { type: 'thumbs-up', icon: 'thumbs-up', label: 'Like' },
  { type: 'celebrate', icon: 'sparkle', label: 'Celebrate' },
];

const DEFAULT_MESSAGES: ArvoMessageThreadMessage[] = [
  {
    id: 'maya', author: 'Maya Patel', initials: 'MP', role: 'Product designer', timestamp: '4d',
    text: 'The new empty state is looking great. Could we make the primary action a little more prominent on smaller screens?',
    reactions: { heart: 2, 'thumbs-up': 4 },
    replies: [{ id: 'noah', author: 'Noah Williams', initials: 'NW', role: 'Design systems', timestamp: '3d', text: 'Yes — I’ve added the responsive variant and kept the action within thumb reach.', reactions: { 'thumbs-up': 1 } }],
  },
  { id: 'jordan', author: 'Jordan Lee', initials: 'JL', role: 'Frontend engineer', timestamp: '1d', text: 'I’ve updated the docs example with the new copy. Let me know if the tone feels right before I publish it.', isCurrentUser: true },
];

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function icon(name: string): HTMLElement {
  const node = element('i', `o9con o9con-${name}`);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

function cloneMessages(messages: ArvoMessageThreadMessage[]): ArvoMessageThreadMessage[] {
  return structuredClone(messages);
}

export class ArvoMessageThread {
  readonly el: HTMLElement;
  private messages: ArvoMessageThreadMessage[];
  private resolved: boolean;
  private activeReplyId: string | null = null;
  private activeEditId: string | null = null;
  private reactions = new Map<string, ArvoMessageThreadReaction>();
  private avatars: ArvoAvatar[] = [];
  private readonly options: Required<Pick<ArvoMessageThreadOptions, 'heading' | 'subtitle' | 'allowResolve'>> & ArvoMessageThreadOptions;

  static initialize(host: HTMLElement | null, options?: ArvoMessageThreadOptions): ArvoMessageThread {
    return new ArvoMessageThread(host ?? document.createElement('section'), options);
  }

  constructor(host: HTMLElement, options: ArvoMessageThreadOptions = {}) {
    this.el = host;
    this.options = { heading: '', subtitle: '', allowResolve: false, ...options };
    this.messages = cloneMessages(options.messages ?? DEFAULT_MESSAGES);
    this.resolved = options.initiallyResolved ?? false;
    this.render();
  }

  setMessages(messages: ArvoMessageThreadMessage[]): void {
    this.messages = cloneMessages(messages);
    this.reactions.clear();
    this.activeReplyId = null;
    this.activeEditId = null;
    this.render();
  }

  setResolved(resolved: boolean): void {
    this.resolved = resolved;
    this.render();
    this.options.onResolvedChange?.(resolved);
    this.el.dispatchEvent(new CustomEvent('msg-thread:resolved-change', { bubbles: true, detail: { resolved } }));
  }

  getResolved(): boolean { return this.resolved; }

  destroy(): void {
    this.destroyAvatars();
    this.el.replaceChildren();
    this.el.removeAttribute('class');
    this.el.removeAttribute('role');
    this.el.removeAttribute('aria-label');
  }

  private render(): void {
    this.destroyAvatars();
    this.el.className = ['arvo-msg-thread', this.resolved ? 'is-resolved' : ''].filter(Boolean).join(' ');
    this.el.setAttribute('role', 'region');
    this.el.setAttribute('aria-label', this.options.heading || 'Message thread');
    this.el.replaceChildren();

    const hasHeader = this.options.heading || this.options.subtitle || this.options.allowResolve;
    if (hasHeader) this.el.append(this.renderHeader());

    const list = element('div', 'arvo-msg-thread__list');
    this.messages.forEach((message) => list.append(this.renderMessage(message)));
    this.el.append(list, this.renderComposer(null));
  }

  private renderHeader(): HTMLElement {
    const heading = element('div', 'arvo-msg-thread__heading');
    if (this.options.heading || this.options.subtitle) {
      const copy = element('div');
      if (this.options.heading) {
        const title = element('h2', 'arvo-msg-thread__title');
        title.textContent = this.options.heading;
        copy.append(title);
      }
      if (this.options.subtitle) {
        const subtitle = element('p', 'arvo-msg-thread__subtitle');
        subtitle.textContent = this.options.subtitle;
        copy.append(subtitle);
      }
      heading.append(copy);
    }
    if (this.options.allowResolve) {
      const resolve = element('button', `arvo-msg-thread__resolve${this.resolved ? ' is-resolved' : ''}`);
      resolve.type = 'button';
      resolve.setAttribute('aria-pressed', String(this.resolved));
      resolve.append(icon(this.resolved ? 'check-circle' : 'comment-check'), document.createTextNode(this.resolved ? 'Resolved' : 'Mark resolved'));
      resolve.addEventListener('click', () => this.setResolved(!this.resolved));
      heading.append(resolve);
    }
    return heading;
  }

  private renderMessage(message: ArvoMessageThreadMessage): HTMLElement {
    const article = element('article', 'arvo-msg-thread__message');
    article.dataset.messageId = message.id;

    const avatarWrap = element('span', 'arvo-msg-thread__avatar');
    const avatarHost = document.createElement('span');
    avatarWrap.append(avatarHost);
    this.avatars.push(ArvoAvatar.initialize(avatarHost, {
      variant: message.avatarSrc ? 'image' : 'initials', size: 'md', name: message.author,
      src: message.avatarSrc, alt: message.avatarAlt ?? message.author,
    }));

    const body = element('div', 'arvo-msg-thread__body');
    if (this.activeEditId === message.id) body.append(this.renderEditComposer(message));
    else body.append(this.renderCard(message));
    body.append(this.renderActions(message));

    if (this.activeReplyId === message.id) body.append(this.renderComposer(message.id));
    message.replies?.forEach((child) => body.append(this.renderMessage(child)));
    article.append(avatarWrap, body);
    return article;
  }

  private renderCard(message: ArvoMessageThreadMessage): HTMLElement {
    const card = element('div', 'arvo-msg-thread__card');
    const header = element('div', 'arvo-msg-thread__card-head');
    const author = document.createElement('strong');
    author.textContent = message.author;
    const meta = element('span', 'arvo-msg-thread__meta');
    meta.textContent = [message.role, message.timestamp].filter(Boolean).join(' · ');
    header.append(author);
    if (meta.textContent) header.append(meta);
    const text = document.createElement('p');
    text.textContent = message.text;
    card.append(header, text);
    return card;
  }

  private renderActions(message: ArvoMessageThreadMessage): HTMLElement {
    const actions = element('div', 'arvo-msg-thread__actions');
    actions.setAttribute('aria-label', `Actions for ${message.author}'s message`);
    actions.append(this.actionButton('comment-add', 'Reply', () => this.toggleReply(message.id)));
    REACTIONS.forEach((reaction) => {
      const active = this.reactions.get(message.id) === reaction.type;
      const count = (message.reactions?.[reaction.type] ?? 0) + (active ? 1 : 0);
      const button = this.actionButton(reaction.icon, `${reaction.label} (${count})`, () => this.toggleReaction(message.id, reaction.type), 'arvo-msg-thread__reaction');
      button.setAttribute('aria-pressed', String(active));
      if (active) button.classList.add('is-active');
      const countNode = element('span', 'arvo-msg-thread__action-count');
      countNode.textContent = String(count);
      button.append(countNode);
      actions.append(button);
    });
    if (message.isCurrentUser) {
      actions.append(
        this.actionButton('edit', 'Edit message', () => { this.activeEditId = message.id; this.activeReplyId = null; this.render(); }),
        this.actionButton('delete', 'Delete message', () => this.deleteMessage(message), 'arvo-msg-thread__delete'),
      );
    }
    return actions;
  }

  private actionButton(iconName: string, label: string, handler: () => void, className = ''): HTMLButtonElement {
    const button = element('button', ['arvo-msg-thread__action', className].filter(Boolean).join(' '));
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(icon(iconName));
    button.addEventListener('click', handler);
    return button;
  }

  private renderEditComposer(message: ArvoMessageThreadMessage): HTMLElement {
    const form = element('form', 'arvo-msg-thread__edit-composer');
    const input = element('textarea');
    input.rows = 3;
    input.value = message.text;
    input.setAttribute('aria-label', 'Edit message');
    const controls = element('div', 'arvo-msg-thread__composer-actions');
    const cancel = element('button', 'arvo-msg-thread__cancel');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => { this.activeEditId = null; this.render(); });
    const save = element('button', 'arvo-msg-thread__send');
    save.type = 'submit';
    save.append(icon('check'), document.createTextNode('Save'));
    controls.append(cancel, save);
    form.append(input, controls);
    form.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); this.activeEditId = null; this.render(); }
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) form.requestSubmit();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text || text === message.text) { this.activeEditId = null; this.render(); return; }
      message.text = text;
      this.activeEditId = null;
      this.options.onMessageEdit?.(message);
      this.el.dispatchEvent(new CustomEvent('msg-thread:message-edit', { bubbles: true, detail: { message } }));
      this.render();
    });
    return form;
  }

  private renderComposer(parentId: string | null): HTMLElement {
    const form = element('form', parentId ? 'arvo-msg-thread__reply-composer' : 'arvo-msg-thread__composer');
    const input = element('textarea');
    input.rows = parentId ? 2 : 3;
    input.placeholder = parentId ? 'Write a reply…' : 'Add to the discussion…';
    input.setAttribute('aria-label', input.placeholder);
    const controls = element('div', 'arvo-msg-thread__composer-actions');
    if (parentId) {
      const cancel = element('button', 'arvo-msg-thread__cancel');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => { this.activeReplyId = null; this.render(); });
      controls.append(cancel);
    }
    const send = element('button', 'arvo-msg-thread__send');
    send.type = 'submit';
    send.append(icon('paper-plane-send'), document.createTextNode(parentId ? 'Reply' : 'Send'));
    controls.append(send);
    form.append(input, controls);
    form.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && parentId) { event.preventDefault(); this.activeReplyId = null; this.render(); }
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) form.requestSubmit();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const currentUser = this.options.currentUser ?? { name: 'You', initials: 'YO' };
      const message: ArvoMessageThreadMessage = { id: `message-${Date.now()}`, author: currentUser.name, initials: currentUser.initials, avatarSrc: currentUser.avatarSrc, avatarAlt: currentUser.avatarAlt, text, timestamp: 'now', isCurrentUser: true };
      if (parentId) {
        const parent = this.findMessage(parentId);
        if (parent) (parent.replies ??= []).push(message);
      } else this.messages.push(message);
      this.options.onMessage?.({ message: text, parentId });
      this.el.dispatchEvent(new CustomEvent('msg-thread:message', { bubbles: true, detail: { message: text, parentId } }));
      this.activeReplyId = null;
      this.render();
    });
    return form;
  }

  private toggleReply(id: string): void {
    this.activeReplyId = this.activeReplyId === id ? null : id;
    this.activeEditId = null;
    this.render();
  }

  private toggleReaction(messageId: string, reaction: ArvoMessageThreadReaction): void {
    const current = this.reactions.get(messageId);
    if (current === reaction) this.reactions.delete(messageId);
    else this.reactions.set(messageId, reaction);
    this.el.dispatchEvent(new CustomEvent('msg-thread:reaction-change', { bubbles: true, detail: { messageId, reaction: this.reactions.get(messageId) ?? null } }));
    this.render();
  }

  private deleteMessage(message: ArvoMessageThreadMessage): void {
    if (!this.removeMessage(message.id)) return;
    this.reactions.delete(message.id);
    this.options.onMessageDelete?.(message);
    this.el.dispatchEvent(new CustomEvent('msg-thread:message-delete', { bubbles: true, detail: { message } }));
    this.render();
  }

  private findMessage(id: string, messages = this.messages): ArvoMessageThreadMessage | undefined {
    for (const message of messages) {
      if (message.id === id) return message;
      const nested = message.replies && this.findMessage(id, message.replies);
      if (nested) return nested;
    }
    return undefined;
  }

  private removeMessage(id: string, messages = this.messages): boolean {
    const index = messages.findIndex((message) => message.id === id);
    if (index >= 0) { messages.splice(index, 1); return true; }
    return messages.some((message) => message.replies ? this.removeMessage(id, message.replies) : false);
  }

  private destroyAvatars(): void {
    this.avatars.forEach((avatar) => avatar.destroy());
    this.avatars = [];
  }
}
