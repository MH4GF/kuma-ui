import {
  Project,
  Node,
  SyntaxKind,
  JsxOpeningElement,
  JsxSelfClosingElement,
} from "ts-morph";
import { collectPropsFromJsx } from "./collector";
import { extractProps } from "./extractor";
import { componentList } from "@kuma-ui/core/components/componentList";
import { processTaggedTemplateExpression } from "./processTaggedTemplateExpression";

const project = new Project({});

const compile = (
  code: string,
  id: string,
  bindings: Record<string, string>
) => {
  const css: string[] = [];
  const source = project.createSourceFile(id, code, { overwrite: true });
  source.forEachDescendant((node) => {
    if (
      node.getKind() === SyntaxKind.JsxElement ||
      node.getKind() === SyntaxKind.JsxSelfClosingElement
    ) {
      let openingElement: JsxOpeningElement | JsxSelfClosingElement;
      if (node.getKind() === SyntaxKind.JsxElement) {
        const jsxElement = node.asKindOrThrow(SyntaxKind.JsxElement);
        openingElement = jsxElement.getOpeningElement();
      } else {
        openingElement = node.asKindOrThrow(SyntaxKind.JsxSelfClosingElement);
      }
      const jsxTagName = openingElement.getTagNameNode().getText();
      // Check if the current JSX element is a Kuma component
      const originalComponentName = Object.keys(bindings).find(
        (key) =>
          bindings[key] === jsxTagName &&
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- FIXME
          Object.values(componentList).some((c) => c === key)
      );
      if (!originalComponentName) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME
      const componentName =
        originalComponentName as (typeof componentList)[keyof typeof componentList];
      const extractedPropsMap = collectPropsFromJsx(openingElement);
      const result = extractProps(
        componentName,
        openingElement,
        extractedPropsMap
      );
      if (result) css.push(result.css);
    }
    if (Node.isTaggedTemplateExpression(node)) {
      processTaggedTemplateExpression(node, bindings);
    }
  });
  return { code: source.getFullText(), id, css: css.join(" ") };
};

export { compile };
