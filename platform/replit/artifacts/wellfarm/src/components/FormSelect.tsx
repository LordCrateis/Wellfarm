import { Children, isValidElement, type ReactElement, type SelectHTMLAttributes, type ChangeEvent } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useTranslation } from "@/i18n/TranslationProvider";

export function FormSelect({ children, value, defaultValue, onChange, className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const { t } = useTranslation();
  const options = Children.toArray(children).filter(isValidElement) as ReactElement<{value?: string; children: string; disabled?: boolean}>[];
  return <Select value={value === undefined ? undefined : String(value)} defaultValue={String(defaultValue ?? options[0]?.props.value ?? options[0]?.props.children ?? "")} disabled={props.disabled} onValueChange={value => onChange?.({ target: { value }, currentTarget: { value } } as ChangeEvent<HTMLSelectElement>)}>
    <SelectTrigger className={className} id={props.id} aria-label={props["aria-label"]} data-testid={(props as Record<string, unknown>)["data-testid"]}><SelectValue /></SelectTrigger>
    <SelectContent>{options.map(option => { const value = String(option.props.value ?? option.props.children); return <SelectItem key={value} value={value} disabled={option.props.disabled}>{t(String(option.props.children))}</SelectItem>; })}</SelectContent>
  </Select>;
}
