export {};

declare global {
  interface Window {
    api: {
      app: {
        getVersion(): Promise<any>;
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
    };
  }
}
