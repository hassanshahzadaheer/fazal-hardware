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
    };
  }
}
