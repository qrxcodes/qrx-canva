// Stand-in for @canva/asset outside Canva (screenshots only).
export const upload = async () => ({
  ref: "harness",
  whenUploaded: async () => undefined,
});
