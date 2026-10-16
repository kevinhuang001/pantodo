import { t } from '@/i18n'
import type { MessageKey } from '@/i18n'

import { Icon } from './Icon'
import type { IconName } from './Icon'

interface EmptyStateProps {
  icon: IconName
  titleKey: MessageKey
  bodyKey: MessageKey
  action?: { labelKey: MessageKey; onSelect: () => void }
}

export function EmptyState({ icon, titleKey, bodyKey, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="emblem">
        <Icon name={icon} size={53} />
      </span>
      <span className="eyebrow">{t('app.name')}</span>
      <h1>{t(titleKey)}</h1>
      <p>{t(bodyKey)}</p>
      {action === undefined ? null : (
        <div className="empty-actions">
          <button type="button" className="primary" onClick={action.onSelect}>
            <Icon name="plus" />
            {t(action.labelKey)}
          </button>
        </div>
      )}
    </div>
  )
}
