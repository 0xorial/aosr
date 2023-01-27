let nextId = 0;

export class HeadNode<T> {
  public id = nextId++;
  public next: LinkedListNode<T> | TailNode<T>;

  constructor() {
    this.next = new TailNode(this);
  }
}

// tslint:disable-next-line:max-classes-per-file
export class TailNode<T> {
  public id = nextId++;
  public previous: LinkedListNode<T> | HeadNode<T>;

  constructor(head: HeadNode<T>) {
    this.previous = head;
  }
}

// tslint:disable-next-line:max-classes-per-file
export class LinkedListNode<T> {
  public id = nextId++;
  public next: LinkedListNode<T> | TailNode<T> | null = null;
  public previous: LinkedListNode<T> | HeadNode<T> | null = null;
  public readonly item: T;

  constructor(item: T) {
    this.item = item;
  }

  public detachSelf() {
    if (!this.next && !this.previous) {
      throw new Error('node is not attached');
    }
    if (this.next) {
      this.next.previous = this.previous;
    }
    if (this.previous) {
      this.previous.next = this.next;
    }

    this.next = null;
    this.previous = null;
  }

  public attachAfter(node: LinkedListNode<T> | HeadNode<T>) {
    if (this.next || this.previous) {
      throw new Error('Node is inserted elsewhere');
    }

    this.next = node.next;
    this.previous = node;

    if (node.next) {
      node.next.previous = this;
    }
    node.next = this;
  }

  public attachBefore(node: LinkedListNode<T> | TailNode<T>) {
    if (!node.previous) {
      throw new Error('no previous node found.');
    }
    this.attachAfter(node.previous);
  }

  public isAttached() {
    return this.next !== undefined;
  }
}

// tslint:disable-next-line:max-classes-per-file
export class LinkedList<T> {
  public head: HeadNode<T>;
  public tail: TailNode<T>;

  constructor() {
    this.head = new HeadNode<T>();
    this.tail = this.head.next as TailNode<T>;
  }

  public add(item: T): LinkedListNode<T> {
    const newNode = new LinkedListNode(item);
    newNode.attachAfter(this.tail.previous);
    return newNode;
  }

  public getItems(): T[] {
    const result: T[] = [];
    this.forEachUnsafe((item) => {
      result.push(item);
    });
    return result;
  }

  public checkList() {
    let current = this.head.next;
    while (current !== this.tail) {
      // if item is not tail it is always a node
      const item = current as LinkedListNode<T>;
      const next = item.next;
      if (!next) {
        throw new Error('badly attached item found.');
      }
      current = next;
    }
  }

  private forEachUnsafe(callback: (item: T, node: LinkedListNode<T>) => void) {
    let current = this.head.next;
    while (current !== this.tail) {
      // if item is not tail it is always a node
      const item = current as LinkedListNode<T>;
      const next = item.next;
      if (!next) {
        throw new Error('badly attached item found.');
      }
      callback(item.item, item);
      current = next;
    }
  }

  public forEach(callback: (item: T) => void) {
    const items = this.getItems();
    for (let item of items) {
      callback(item);
    }
  }

  public hasItems() {
    return this.head.next !== this.tail;
  }

  public getLastItem() {
    if (!this.hasItems()) {
      throw new Error('no items in list.');
    }
    return this.head.next as LinkedListNode<T>;
  }

  toArray() {
    const result: T[] = [];
    this.forEach((x) => {
      result.push(x);
    });
    return result;
  }
}
