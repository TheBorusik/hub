import type { Command, CommandContext } from "./types";

type Listener = () => void;

class CommandRegistry {
  private commands = new Map<string, Command>();
  private listeners = new Set<Listener>();
  /**
   * Кеш отсортированного списка. `useSyncExternalStore` требует стабильную
   * ссылку между эмитами — пересчитываем только при изменении команд.
   */
  private cachedList: Command[] | null = null;

  register(cmd: Command): () => void {
    const existing = this.commands.get(cmd.id);
    if (existing === cmd) return () => this.unregister(cmd.id);
    this.commands.set(cmd.id, cmd);
    this.invalidate();
    return () => this.unregister(cmd.id);
  }

  /** Зарегистрировать несколько команд атомарно — один emit в конце. */
  registerMany(cmds: Command[]): () => void {
    const ids = cmds.map((c) => c.id);
    let changed = false;
    for (const c of cmds) {
      if (this.commands.get(c.id) !== c) {
        this.commands.set(c.id, c);
        changed = true;
      }
    }
    if (changed) this.invalidate();
    return () => {
      let removed = false;
      for (const id of ids) {
        if (this.commands.delete(id)) removed = true;
      }
      if (removed) this.invalidate();
    };
  }

  unregister(id: string): void {
    if (this.commands.delete(id)) this.invalidate();
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  list(): Command[] {
    if (this.cachedList) return this.cachedList;
    this.cachedList = Array.from(this.commands.values()).sort((a, b) => {
      const ap = a.priority ?? 0;
      const bp = b.priority ?? 0;
      if (ap !== bp) return bp - ap;
      return a.title.localeCompare(b.title);
    });
    return this.cachedList;
  }

  async run(id: string, context?: CommandContext): Promise<void> {
    const c = this.commands.get(id);
    if (!c) throw new Error(`Command not registered: ${id}`);
    if (c.isEnabled && !c.isEnabled(context)) return;
    await c.run(context);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private invalidate(): void {
    this.cachedList = null;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}

export const commandRegistry = new CommandRegistry();
