import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const container = document.querySelector(".app");

    if (container) {
      container.scrollTo({
        top: 0,
        behavior: "auto",
      });
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;