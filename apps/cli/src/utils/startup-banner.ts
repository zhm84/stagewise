import table from 'cli-table3';
import { log } from './logger.js';
import chalk from 'chalk';

type StartupBannerProps = {
  email: string;
};

export function startupBanner({ email }: StartupBannerProps) {
  const t = new table({
    head: [
      chalk.cyan.bold('Email'),
      chalk.cyan.bold('Subscription (new pricing)'),
    ],
    colWidths: [email.length + 4, 43],
  });
  t.push([email, `Check at https://console.stagewise.io`]);
  log.info(t.toString());
}
