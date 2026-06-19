export const env = {
  get port() {
    return Number(process.env.PORT ?? 8787);
  },
  get adminPassword() {
    return process.env.ADMIN_PASSWORD ?? "admin123";
  }
};
