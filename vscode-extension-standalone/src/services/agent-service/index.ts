import { dispatchAgentCall } from 'src/utils/dispatch-agent-call';
import type {
  UserMessage,
  UserMessageContentItem,
  SelectedElement,
} from 'src/types/user-message';

/**
 * Generates a detailed context string for a single HTMLElement.
 */
function generateElementContext(element: SelectedElement): string {
  const nodeType = `<node_type>${element.nodeType}</node_type>`;

  const attributes = `
<attributes>
${Object.entries(element.attributes)
  .map(([key, value]) => `<${key}>${value}</${key}>`)
  .join('\n')}
</attributes>`.trim();

  const properties = `
<properties>
${Object.entries(element.ownProperties)
  .map(([key, value]) => `<${key}>${JSON.stringify(value)}</${key}>`)
  .join('\n')}
</properties>`.trim();

  const boundingClientRect = `<bounding_client_rect>
  <width>${element.boundingClientRect.width}</width>
  <height>${element.boundingClientRect.height}</height>
  <top>${element.boundingClientRect.top}</top>
  <left>${element.boundingClientRect.left}</left>
  </bounding_client_rect>`;

  const textContent = `<text_content>
  ${element.textContent}
  </text_content>`;

  const pluginInfo = `<plugin_info>
  ${element.pluginInfo.map((plugin: { pluginName: string; content: string }) => `<${plugin.pluginName}>${plugin.content}</${plugin.pluginName}>`).join('\n')}
  </plugin_info>`;

  const xpath = `<xpath>${element.xpath}</xpath>`;

  const parent = element.parent
    ? `<parent>${generateElementContext(element.parent)}</parent>`
    : '';

  return `
  ${nodeType}
  ${attributes}
  ${properties}
  ${boundingClientRect}
  ${textContent}
  ${pluginInfo}
  ${xpath}
  ${parent}
  `;
}

/**
 * Creates a comprehensive prompt for a Coding Agent LLM.
 */
export function createPrompt(msg: UserMessage): string {
  const pluginContext = (
    Object.entries(msg.pluginContent) as [string, Record<string, UserMessageContentItem>][]
  )
    .map(
      ([pluginName, snippets]): [string, [string, UserMessageContentItem][]] => [
        pluginName,
        Object.entries(snippets).filter(
          ([_, snippet]: [string, UserMessageContentItem]) => snippet.type === 'text',
        ),
      ],
    )
    .filter(([_, snippets]) => snippets.length > 0)
    .map(([pluginName, snippets]) => {
      return `
<plugin_contexts>
<${pluginName}>
${snippets.map((snippet: [string, UserMessageContentItem]) => `<${snippet[0]}>${(snippet[1] as { type: 'text'; text: string }).text}</${snippet[0]}>`).join('\n')}
</${pluginName}>
</plugin_contexts>
`.trim();
    })
    .join('\n');

  const userMessage = msg.contentItems
    .filter((item: UserMessageContentItem) => item.type === 'text')
    .map((item: UserMessageContentItem) => (item as { type: 'text'; text: string }).text)
    .join('\n\n');

  return `
<request>
<user_message>${userMessage}</user_message>
  <url>${msg.metadata.currentUrl}</url>
  <pageTitle>${msg.metadata.currentTitle}</pageTitle>
  <browser_locale>${msg.metadata.locale}</browser_locale>
  <user_agent>${msg.metadata.userAgent}</user_agent>
  ${
    msg.metadata.selectedElements.length > 0
      ? `<selected_elements>
    ${msg.metadata.selectedElements.map((element: SelectedElement, index: number) => `<element_${index}>${generateElementContext(element)}</element_${index}>`).join('\n')}
  </selected_elements>`
      : ''
  }
  ${pluginContext}
</request>`.trim();
}

export async function handleRequestAgentPrompt(userMessage: UserMessage): Promise<void> {
  const request = {
    prompt: createPrompt(userMessage),
    files: [],
    images: [],
  };
  await dispatchAgentCall(request);
}
