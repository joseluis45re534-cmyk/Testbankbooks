import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

function injectNodes(
  htmlString: string,
  target: HTMLElement,
  position: "append" | "prepend",
  label: string
) {
  if (!htmlString.trim()) return;

  const template = document.createElement("template");
  template.innerHTML = htmlString;

  const nodes = Array.from(template.content.childNodes);
  nodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (element.tagName === "SCRIPT") {
        const script = document.createElement("script");
        script.setAttribute("data-custom-script", label);
        Array.from(element.attributes).forEach((attr) =>
          script.setAttribute(attr.name, attr.value)
        );
        script.textContent = element.textContent;
        if (position === "append") {
          target.appendChild(script);
        } else {
          target.insertBefore(script, target.firstChild);
        }
      } else {
        const clone = element.cloneNode(true) as Element;
        clone.setAttribute("data-custom-script", label);
        if (position === "append") {
          target.appendChild(clone);
        } else {
          target.insertBefore(clone, target.firstChild);
        }
      }
    }
  });
}

export function CustomScripts() {
  const { data } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings/custom-html"],
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;

    document.querySelectorAll("[data-custom-script]").forEach((el) => el.remove());

    injectNodes(data.headerHtml || "", document.head, "append", "header");
    injectNodes(data.bodyHtml || "", document.body, "prepend", "body");
    injectNodes(data.footerHtml || "", document.body, "append", "footer");

    return () => {
      document.querySelectorAll("[data-custom-script]").forEach((el) => el.remove());
    };
  }, [data]);

  return null;
}
