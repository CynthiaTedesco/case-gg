import { useRef, useState, type Ref } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { validateAddItem, type AddItemForm, type NewItem } from '../wishlist/validation';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Resolves once the server has saved the item. Rejects if it couldn't. */
  onSubmit: (item: NewItem) => Promise<void>;
};

type Field = keyof AddItemForm;

const EMPTY_FORM: AddItemForm = { title: '', price: '', url: '' };

export function AddItemModal({ visible, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const priceRef = useRef<TextInput>(null);
  const urlRef = useRef<TextInput>(null);

  const result = validateAddItem(form);
  const errors = result.ok ? {} : result.errors;
  // Errors appear once you leave a field or hit Save, not while you're still typing.
  const errorFor = (field: Field) =>
    touched[field] || submitAttempted ? errors[field] : undefined;

  const change = (field: Field) => (text: string) => {
    setForm((current) => ({ ...current, [field]: text }));
    setSaveError(null);
  };
  const blur = (field: Field) => () => setTouched((current) => ({ ...current, [field]: true }));

  const reset = () => {
    setForm(EMPTY_FORM);
    setTouched({});
    setSubmitAttempted(false);
    setSaveError(null);
  };

  // Two ways out, on purpose. Cancel is a deliberate "never mind", so it clears the form.
  // Tapping outside, Escape or Android back is often accidental, so it only hides the form and
  // the draft is still there next time. A failed save keeps everything too.
  const cancel = () => {
    if (saving) return;
    reset();
    onClose();
  };
  const dismiss = () => {
    if (!saving) onClose();
  };

  const submit = async () => {
    setSubmitAttempted(true);
    if (!result.ok || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit(result.value);
      reset();
      onClose();
    } catch {
      setSaveError("Couldn't save the item. Your text is still here. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center bg-black/40"
      >
        <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
          {/* The backdrop: a tap outside the card dismisses the form but keeps the draft. */}
          <Pressable
            accessible={false}
            onPress={dismiss}
            className="flex-grow justify-center px-4 py-8"
          >
            {/* Claims touches on the card itself, so tapping its padding doesn't reach the backdrop. */}
            <View
              onStartShouldSetResponder={() => true}
              className="w-full max-w-md gap-4 self-center rounded-2xl bg-white p-5"
            >
              <Text className="text-xl font-bold text-zinc-900" accessibilityRole="header">
                Add an item
              </Text>

              <FormField
                label="What is it?"
                value={form.title}
                onChangeText={change('title')}
                onBlur={blur('title')}
                error={errorFor('title')}
                placeholder="Wool blanket, dark green"
                autoFocus
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => priceRef.current?.focus()}
              />
              <FormField
                inputRef={priceRef}
                label="Price (kr.)"
                value={form.price}
                onChangeText={change('price')}
                onBlur={blur('price')}
                error={errorFor('price')}
                placeholder="449,95"
                keyboardType="decimal-pad"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => urlRef.current?.focus()}
              />
              <FormField
                inputRef={urlRef}
                label="Link"
                value={form.url}
                onChangeText={change('url')}
                onBlur={blur('url')}
                error={errorFor('url')}
                placeholder="shop.dk/item"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={submit}
              />

              {saveError ? (
                <Text className="text-sm text-red-700" accessibilityLiveRegion="polite">
                  {saveError}
                </Text>
              ) : null}

              <View className="flex-row justify-end gap-2">
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={cancel}
                  className="rounded-xl px-4 py-3 active:opacity-70"
                >
                  <Text className="font-semibold text-zinc-600">Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: saving, busy: saving }}
                  disabled={saving}
                  onPress={submit}
                  className={`flex-row items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 active:opacity-70 ${
                    saving ? 'opacity-60' : ''
                  }`}
                >
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : null}
                  <Text className="font-semibold text-white">{saving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  inputRef?: Ref<TextInput>;
};

function FormField({ label, error, inputRef, ...inputProps }: FormFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-zinc-700">{label}</Text>
      {/* text-[16px], not text-base: text-base also sets a line height, and iOS crops the text of
          a single-line TextInput with a line height while it's being edited. 16px also stops
          iOS Safari from zooming in on focus. */}
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor="#a1a1aa"
        className={`rounded-xl border bg-white px-3 py-2.5 text-[16px] text-zinc-900 ${
          error ? 'border-red-600' : 'border-zinc-300'
        }`}
        {...inputProps}
      />
      {error ? <Text className="text-sm text-red-700">{error}</Text> : null}
    </View>
  );
}
