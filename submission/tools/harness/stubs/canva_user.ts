// Stand-in for @canva/user outside Canva (screenshots only).
export const auth = {
  initOauth: () => undefined,
  getCanvaUserToken: async () => "harness",
};
