import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { FormItem, useFormField } from './form';

type FormFieldProps = {
  name: string;
  render: (props: { field: any; fieldState: any; formState: any }) => React.ReactNode;
  defaultValue?: any;
  rules?: any;
};

const FormField = ({
  name,
  render,
  defaultValue,
  rules,
  ...props
}: FormFieldProps) => {
  const { control } = useFormContext();

  return (
    <FormItem>
      <Controller
        control={control}
        name={name}
        defaultValue={defaultValue}
        rules={rules}
        render={({ field, fieldState, formState }) => (
          <>
            {render({ field, fieldState, formState })}
            {fieldState.error && (
              <p className="text-sm font-medium text-destructive">
                {fieldState.error.message}
              </p>
            )}
          </>
        )}
        {...props}
      />
    </FormItem>
  );
};

export { FormField };
