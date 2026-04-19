import type { Command, CommandContext } from "./types";

type Listener = () => void;

class CommandRegistry {
  private commands = new Map<string, Command>();
  private listeners = new Set<Listener>();

  register(cmd: Command): () => void {
    if (this.commands.has(cmd.id)) {
      // Idempotent: последняя регистрация побеждает (полезно для HMR).
      this.commands.set(cmd.id, cmd);
    } else {
      this.commands.set(cmd.id, cmd);
    }
    this.emit();
    return () => this.unregister(cmd.id);
  }

  /** Зарегистрировать несколько команд атомарно — один emit в конце. */
  registerMany(cmds: Command[]): () => void {
    const ids = cmds.map((c) => c.id);
    for (const c of cmds) this.commands.set(c.id, c);
    this.emit();
    return () => {
      let changed = false;
      for (const id of ids) {
        if (this.commands.delete(id)) changed = true;
      }
      if (changed) this.emit();
    };
  }

  unregister(id: string): void {
    if (this.commands.delete(id)) this.emit();
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  list(): Command[] {
    return Array.from(this.commands.values()).sort((a, b) => {
      const ap = a.priority ?? 0;
      const bp = b.priority ?? 0;
      if (ap !== bp) return bp - ap;
      return a.title.localeCompare(b.title);
    });
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

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}

export const commandRegistry = new CommandRegistry();
