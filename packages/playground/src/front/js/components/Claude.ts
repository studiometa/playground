import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';
import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeProps extends BaseProps {
  $options: {
    apiKey: string;
  };
  $refs: {
    apiKey: HTMLInputElement;
    prompt: HTMLFormElement;
    response: HTMLPreElement;
  };
}

/**
 * Claude class.
 */
export default class Claude extends Base<ClaudeProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'Claude',
    options: {
      apiKey: String,
    },
    refs: ['api-key', 'prompt', 'response'],
  };

  get apiKey() {
    return this.$refs.apiKey.value;
  }

  /**
   * @private
   */
  __claude: Anthropic;

  get claude() {
    const { apiKey } = this;

    if (apiKey && !this.__claude) {
      this.__claude = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
    }

    return this.__claude;
  }

  onPromptSubmit({ event, target }) {
    event.preventDefault();
    const data = new FormData(target);
    this.message(data.get('prompt') as string);
  }

  async message(data: string) {
    this.$refs.response.textContent = 'Thinking...';

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: data,
        },
      ],
    });
    console.log(response);
    const lines = [];
    for (const line of response.content) {
      if (line.type === 'text') {
        lines.push(line.text);
      }
    }

    this.$refs.response.textContent = lines.join('\n');
  }
}
