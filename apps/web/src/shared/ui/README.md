# Shared UI components

Import from `apps/web/src/shared/ui` for all new screens.

```js
import {
  Alert,
  Button,
  ConfirmDialog,
  Field,
  FormSection,
  Input,
  Modal,
  Select,
  StatusBadge,
  Textarea,
} from '../../shared/ui/index.js';

import {
  normalizeEmail,
  normalizePhone,
  validateEmailField,
  validatePhoneField,
} from '../../shared/lib/validation.js';
```

Do **not** recreate one-off form controls, badges, or modals inside feature folders. Extend this kit instead.
