import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';

export interface IframeReloaderProps extends BaseProps {}

/**
 * IframeReloader class.
 */
export default class IframeReloader extends Base<IframeReloaderProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'IframeReloader',
  };
}
