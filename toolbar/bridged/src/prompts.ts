import type { ContextSnippet } from './plugin-sdk/plugin.js';

/**
 * Extracts relevant attributes from an HTMLElement.
 * Filters out potentially noisy attributes like 'style' if computed styles are handled separately.
 * Prioritizes identifying attributes.
 */
function getElementAttributes(element: HTMLElement): { [key: string]: string } {
  const attrs: { [key: string]: string } = {};
  const priorityAttrs = [
    'id',
    'class',
    'name',
    'type',
    'href',
    'src',
    'alt',
    'for',
    'placeholder',
  ]; // Common identifying attributes
  const dataAttrs = [];

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    // Store data-* attributes separately for emphasis
    if (attr.name.startsWith('data-')) {
      dataAttrs.push({ name: attr.name, value: attr.value });
    }
    // Capture priority attributes or others, potentially excluding style if handled elsewhere
    else if (
      priorityAttrs.includes(attr.name.toLowerCase()) ||
      attr.name.toLowerCase() !== 'style'
    ) {
      // Include 'class' even though classList is preferred, as it's in the source HTML
      attrs[attr.name] = attr.value;
    }
  }
  // Add data attributes to the main dictionary, perhaps prefixed for clarity
  dataAttrs.forEach((da) => {
    attrs[da.name] = da.value;
  });
  return attrs;
}

/**
 * Recursively generates context for child elements up to a specified depth.
 * @param element - The parent element whose children to process
 * @param currentDepth - Current depth level (1-based)
 * @param maxDepth - Maximum depth to traverse (default 3)
 * @param maxChildrenPerLevel - Maximum number of children to include per level (default 3)
 * @param indent - Base indentation for formatting
 */
function generateChildrenContext(
  element: HTMLElement,
  currentDepth = 1,
  maxDepth = 3,
  maxChildrenPerLevel = 3,
  indent = '      ',
): string {
  if (
    currentDepth > maxDepth ||
    !element.children ||
    element.children.length === 0
  ) {
    return '';
  }

  let context = '';
  const childrenToProcess = Math.min(
    element.children.length,
    maxChildrenPerLevel,
  );

  for (let i = 0; i < childrenToProcess; i++) {
    const child = element.children[i] as HTMLElement;
    if (!child) continue;

    context += `${indent}<child depth="${currentDepth}" index="${i + 1}">\n`;
    context += `${indent}  <tag>${child.tagName.toLowerCase()}</tag>\n`;

    if (child.id) {
      context += `${indent}  <id>${child.id}</id>\n`;
    }

    const classes = Array.from(child.classList).join(' ');
    if (classes) {
      context += `${indent}  <classes>${classes}</classes>\n`;
    }

    // Add text content if it's directly in this element (not from children)
    const directText = Array.from(child.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim())
      .filter((text) => text)
      .join(' ');

    if (directText) {
      const maxLength = 100;
      const truncatedText =
        directText.length > maxLength
          ? `${directText.substring(0, maxLength)}...`
          : directText;
      context += `${indent}  <text>${truncatedText}</text>\n`;
    }

    // Recursively add children if we haven't reached max depth
    if (currentDepth < maxDepth && child.children.length > 0) {
      const childrenContext = generateChildrenContext(
        child,
        currentDepth + 1,
        maxDepth,
        maxChildrenPerLevel,
        `${indent}    `,
      );
      if (childrenContext) {
        context += `${indent}  <children>\n`;
        context += childrenContext;
        context += `${indent}  </children>\n`;
      }
    }

    context += `${indent}</child>\n`;
  }

  // Add note if there are more children than shown
  if (element.children.length > maxChildrenPerLevel) {
    context += `${indent}<!-- ${element.children.length - maxChildrenPerLevel} more child element(s) not shown -->\n`;
  }

  return context;
}

/**
 * Generates a comprehensive context string for a single HTMLElement.
 */
function generateElementContext(element: HTMLElement, index: number): string {
  let context = `  <element index="${index + 1}">\n`;
  context += `    <tag>${element.tagName.toLowerCase()}</tag>\n`;

  const id = element.id;
  if (id) {
    context += `    <id>${id}</id>\n`;
  }

  const classes = Array.from(element.classList).join(' ');
  if (classes) {
    context += `    <classes>${classes}</classes>\n`;
  }

  // Include all attributes
  const attributes = getElementAttributes(element);
  if (Object.keys(attributes).length > 0) {
    context += `    <attributes>\n`;
    for (const [key, value] of Object.entries(attributes)) {
      // Skip class and id as they're already included above
      if (key.toLowerCase() !== 'class' && key.toLowerCase() !== 'id') {
        context += `      <${key}>${value}</${key}>\n`;
      }
    }
    context += `    </attributes>\n`;
  }

  // Include full text content
  const text = element.innerText?.trim();
  if (text) {
    const maxLength = 200; // Increased from 50 to capture more context
    context += `    <text>${text.length > maxLength ? `${text.substring(0, maxLength)}...` : text}</text>\n`;
  }

  // Include parent element context (enhanced formatting)
  context += `    <!-- PARENT ELEMENT -->\n`;
  context += `    <parent_element>\n`;
  if (element.parentElement) {
    const parent = element.parentElement;
    context += `      <tag>${parent.tagName.toLowerCase()}</tag>\n`;
    if (parent.id) {
      context += `      <id>${parent.id}</id>\n`;
    }
    const parentClasses = Array.from(parent.classList).join(' ');
    if (parentClasses) {
      context += `      <classes>${parentClasses}</classes>\n`;
    }
  } else {
    context += `      <note>No parent element found (likely root or disconnected)</note>\n`;
  }
  context += `    </parent_element>\n`;

  // Include recursive child elements (up to 3 levels deep)
  if (element.children && element.children.length > 0) {
    context += `    <!-- CHILD ELEMENTS (recursive, max 3 levels deep) -->\n`;
    context += `    <child_elements>\n`;
    const childrenContext = generateChildrenContext(element);
    context += childrenContext;
    context += `    </child_elements>\n`;
  }

  // Include computed styles
  try {
    const styles = window.getComputedStyle(element);
    const relevantStyles = {
      display: styles.display,
      position: styles.position,
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      width: styles.width,
      height: styles.height,
      padding: styles.padding,
      margin: styles.margin,
    };
    context += `    <computed_styles>\n`;
    for (const [key, value] of Object.entries(relevantStyles)) {
      if (value && value !== 'none' && value !== 'auto' && value !== '0px') {
        context += `      <${key}>${value}</${key}>\n`;
      }
    }
    context += `    </computed_styles>\n`;
  } catch (_e) {
    context += `    <computed_styles>Could not retrieve computed styles</computed_styles>\n`;
  }

  context += `  </element>\n`;
  return context;
}

export interface PluginContextSnippets {
  pluginName: string;
  contextSnippets: ContextSnippet[];
}
[];

/**
 * Creates a clear, action-oriented prompt for a Coding Agent LLM.
 *
 * @param selectedElements - An array of HTMLElements the user interacted with.
 * @param userPrompt - The user's natural language instruction.
 * @param url - The URL of the page where the interaction occurred.
 * @param contextSnippets - An array of context snippets from a list of plugins.
 * @returns A formatted string prompt for the LLM.
 */
//zhm: 发送给VSCode扩展的完整信息包括：DOM信息、当前页面url、框架特定上下文
export function createPrompt(
  selectedElements: HTMLElement[],
  userPrompt: string,
  url: string,
  contextSnippets: PluginContextSnippets[],
): string {
  // Format plugin contexts if available
  const pluginContext =
    contextSnippets.length > 0
      ? `\n<plugin_contexts>\n${contextSnippets
          .map(
            (snippet) =>
              `  <${snippet.pluginName}>\n${snippet.contextSnippets
                .map(
                  (s) =>
                    `    <${s.promptContextName}>${s.content}</${s.promptContextName}>`,
                )
                .join('\n')}\n  </${snippet.pluginName}>`,
          )
          .join('\n')}\n</plugin_contexts>`
      : '';

  // Handle case when no elements are selected
  if (!selectedElements || selectedElements.length === 0) {
    return `<task>
  <action>Implement the frontend changes based on my request and the provided context below.</action>
  <user_request>${userPrompt}</user_request>
  <page_url>${url}</page_url>
  <note>No specific elements were selected. Analyze the general page implementation or request clarification.</note>
</task>${pluginContext}`.trim();
  }

  // Generate comprehensive context for each element
  let elementContext = '';
  selectedElements.forEach((element, index) => {
    elementContext += generateElementContext(element, index);
  });

  // Build the complete prompt with clear structure
  return `<task>
  <action>Implement the frontend changes based on my request and the provided context below.</action>
  <user_request>${userPrompt}</user_request>
  <page_url>${url}</page_url>
</task>

<selected_elements>
${elementContext}</selected_elements>${pluginContext}`.trim();
}
