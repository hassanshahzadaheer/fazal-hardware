export {};

declare global {
  interface Window {
    api: {
      auth: {
        login(u: string, p: string): Promise<any>;
        logout(): Promise<any>;
        getCurrentUser(): Promise<any>;
      };
      products: {
        list(q: any): Promise<any>;
        get(id: number): Promise<any>;
        create(dto: any): Promise<any>;
        update(id: number, dto: any): Promise<any>;
        deactivate(id: number): Promise<any>;
        ledger(id: number): Promise<any>;
      };
      parties: {
        customers: any;
        suppliers: any;
        ledger(type: string, id: number, range: any): Promise<any>;
      };
      sales: {
        create(dto: any): Promise<any>;
        get(id: number): Promise<any>;
        list(q: any): Promise<any>;
        void(id: number, reason: string): Promise<any>;
        fromQuotation(qid: number): Promise<any>;
      };
      quotations: {
        create(dto: any): Promise<any>;
        get(id: number): Promise<any>;
        list(q: any): Promise<any>;
        convert(id: number): Promise<any>;
      };
      purchases: {
        create(dto: any): Promise<any>;
        get(id: number): Promise<any>;
        list(q: any): Promise<any>;
        void(id: number): Promise<any>;
      };
      payments: {
        customer(dto: any): Promise<any>;
        supplier(dto: any): Promise<any>;
        list(q: any): Promise<any>;
      };
      expenses: {
        create(dto: any): Promise<any>;
        list(q: any): Promise<any>;
      };
      reports: {
        run(name: string, params: any): Promise<any>;
      };
      print: {
        invoice(id: number, format: 'a4' | 'thermal'): Promise<any>;
        quotation(id: number): Promise<any>;
        receipt(id: number): Promise<any>;
        report(name: string, params: any): Promise<any>;
      };
      settings: {
        get(): Promise<any>;
        update(dto: any): Promise<any>;
      };
      users: any;
      backup: {
        now(): Promise<any>;
        restore(path: string): Promise<any>;
        list(): Promise<any>;
      };
    };
  }
}
