import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export function CustomScripts() {
  const { data } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings/custom-html"],
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;

    if (data.headerHtml) {
      const existing = document.getElementById("custom-header-html");
      if (existing) existing.remove();
      const container = document.createElement("div");
      container.id = "custom-header-html";
      container.innerHTML = data.headerHtml;
      const scripts = container.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
      });
      document.head.appendChild(container);
    }

    if (data.bodyHtml) {
      const existing = document.getElementById("custom-body-html");
      if (existing) existing.remove();
      const container = document.createElement("div");
      container.id = "custom-body-html";
      container.innerHTML = data.bodyHtml;
      const scripts = container.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
      });
      document.body.insertBefore(container, document.body.firstChild);
    }

    if (data.footerHtml) {
      const existing = document.getElementById("custom-footer-html");
      if (existing) existing.remove();
      const container = document.createElement("div");
      container.id = "custom-footer-html";
      container.innerHTML = data.footerHtml;
      const scripts = container.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
      });
      document.body.appendChild(container);
    }

    return () => {
      document.getElementById("custom-header-html")?.remove();
      document.getElementById("custom-body-html")?.remove();
      document.getElementById("custom-footer-html")?.remove();
    };
  }, [data]);

  return null;
}
