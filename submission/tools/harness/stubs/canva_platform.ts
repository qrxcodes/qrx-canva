// Stand-in for @canva/platform outside Canva (screenshots only).
declare global {
  interface Window {
    harnessPayments?: boolean;
  }
}

export const getPlatformInfo = () => ({
  canAcceptPayments: Boolean(window.harnessPayments),
});

export const requestOpenExternalUrl = async () => ({ status: "completed" });
