import { useEffect, useState } from "react";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: { mobile?: boolean };
};

/**
 * Detect devices where an HTML capture input should offer the rear camera.
 * Viewport width alone is deliberately not used: a narrow desktop window is
 * still a desktop, while an iPad may have a wide viewport.
 */
export function useMobileCamera(): boolean {
  const [hasMobileCamera, setHasMobileCamera] = useState(false);

  useEffect(() => {
    const browser = navigator as NavigatorWithUserAgentData;
    if (typeof browser.userAgentData?.mobile === "boolean") {
      setHasMobileCamera(browser.userAgentData.mobile);
      return;
    }

    const userAgent = navigator.userAgent;
    const mobileUserAgent =
      /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(userAgent);
    const modernIPad =
      /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
    setHasMobileCamera(mobileUserAgent || modernIPad);
  }, []);

  return hasMobileCamera;
}
