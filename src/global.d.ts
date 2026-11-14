export {};

declare global {
  interface Window {
    api: {
      app: {
        getVersion(): Promise<any>;
      };
      license: {
        getStatus(): Promise<any>;
        import(): Promise<any>;
      };
      auth: {
        login(email: string, password: string): Promise<any>;
        logout(): Promise<any>;
        getCurrentUser(): Promise<any>;
      };
      categories: {
        list(): Promise<any>;
        create(payload: unknown): Promise<any>;
        delete(id: number): Promise<any>;
      };
      brands: {
        list(): Promise<any>;
        create(payload: unknown): Promise<any>;
        delete(id: number): Promise<any>;
      };
      settings: {
        get(): Promise<any>;
        update(payload: unknown): Promise<any>;
      };
      products: {
        list(): Promise<any>;
        create(payload: unknown): Promise<any>;
        update(id: number, payload: unknown): Promise<any>;
        delete(id: number): Promise<any>;
      };
      customers: {
        list(): Promise<any>;
        create(payload: unknown): Promise<any>;
        update(id: number, payload: unknown): Promise<any>;
        delete(id: number): Promise<any>;
      };
      suppliers: {
        list(): Promise<any>;
        create(payload: unknown): Promise<any>;
        update(id: number, payload: unknown): Promise<any>;
        delete(id: number): Promise<any>;
      };
      stock: {
        adjust(payload: unknown): Promise<any>;
        history(productId: number): Promise<any>;
      };
      sales: {
        list(): Promise<any>;
        get(id: number): Promise<any>;
        create(payload: unknown): Promise<any>;
        return(id: number, items: unknown, notes?: string | null): Promise<any>;
      };
      purchases: {
        list(): Promise<any>;
        get(id: number): Promise<any>;
        create(payload: unknown): Promise<any>;
      };
      payments: {
        list(): Promise<any>;
        create(payload: unknown): Promise<any>;
      };
      quotations: {
        list(): Promise<any>;
        get(id: number): Promise<any>;
        create(payload: unknown): Promise<any>;
      };
      expenses: {
        list(): Promise<any>;
        create(payload: unknown): Promise<any>;
        update(id: number, payload: unknown): Promise<any>;
        delete(id: number): Promise<any>;
      };
      reports: {
        summary(): Promise<any>;
        salesByDay(days?: number): Promise<any>;
        topProducts(): Promise<any>;
        lowStock(): Promise<any>;
        receivables(): Promise<any>;
        payables(): Promise<any>;
      };
      aiScanner: {
        selectFile(): Promise<any>;
        scan(filePath: string): Promise<any>;
      };
      dashboard: {
        get(): Promise<any>;
      };
      backup: {
        now(): Promise<any>;
        restore(): Promise<any>;
      };
    };
  }
}
