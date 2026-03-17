import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

function parseHtmlString(htmlString: string): Element[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlString}</div>`, "text/html");
  return Array.from(doc.body.firstChild?.childNodes || []).filter(
    (node) => node.nodeType === 1
  ) as Element[];
}

export function CustomScripts() {
  const { data } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings/custom-html"],
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;

    // Clean up previous injections
    document.querySelectorAll("[data-custom-script]").forEach((el) => el.remove());

    if (data.headerHtml) {
      const elements = parseHtmlString(data.headerHtml);
      elements.forEach((element) => {
        element.setAttribute("data-custom-script", "header");
        if (element.tagName === "SCRIPT") {
          const newScript = document.createElement("script");
          Array.from(element.attributes).forEach((attr) => {
            if (attr.name !== "data-custom-script") {
              newScript.setAttribute(attr.name, attr.value);
            }
          });
          newScript.textContent = element.textContent;
          document.head.appendChild(newScript);
        } else {
          document.head.appendChild(element);
        }
      });
    }

    if (data.bodyHtml) {
      const elements = parseHtmlString(data.bodyHtml);
      elements.forEach((element) => {
        element.setAttribute("data-custom-script", "body");
        if (element.tagName === "SCRIPT") {
          const newScript = document.createElement("script");
          Array.from(element.attributes).forEach((attr) => {
            if (attr.name !== "data-custom-script") {
              newScript.setAttribute(attr.name, attr.value);
            }
          });
          newScript.textContent = element.textContent;
          document.body.insertBefore(newScript, document.body.firstChild);
        } else {
          document.body.insertBefore(element, document.body.firstChild);
        }
      });
    }

    if (data.footerHtml) {
      const elements = parseHtmlString(data.footerHtml);
      elements.forEach((element) => {
        element.setAttribute("data-custom-script", "footer");
        if (element.tagName === "SCRIPT") {
          const newScript = document.createElement("script");
          Array.from(element.attributes).forEach((attr) => {
            if (attr.name !== "data-custom-script") {
              newScript.setAttribute(attr.name, attr.value);
            }
          });
          newScript.textContent = element.textContent;
          document.body.appendChild(newScript);
        } else {
          document.body.appendChild(element);
        }
      });
    }

    return () => {
      document.querySelectorAll("[data-custom-script]").forEach((el) => el.remove());
    };
  }, [data]);

  return null;
}
