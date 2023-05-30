/**
 * TODO
 * - Create global error handler callback
 */
import {
  z,
  ZodObject,
  UnknownKeysParam,
  ZodRawShape,
  ZodTypeAny,
  AnyZodObject,
  ZodLiteral,
  ZodDiscriminatedUnion,
} from 'zod';
import type { Tuples, B, Call } from 'hotscript';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

/**
 * @internal
 */
export type ZodPushNotificationDiscriminatedUnionOption<
  Discriminator extends string
> = ZodObject<
  {
    [key in Discriminator]: ZodTypeAny;
  } & ZodRawShape & { payload: AnyZodObject },
  UnknownKeysParam,
  ZodTypeAny
>;

/**
 * @internal
 */
export type DiscUnionOptions = [
  ZodPushNotificationDiscriminatedUnionOption<'type'>,
  ...ZodPushNotificationDiscriminatedUnionOption<'type'>[]
];

/**
 * @internal
 */
export type FindOption<
  Literal extends string,
  Options extends DiscUnionOptions
> = Call<
  Tuples.Find<
    B.Extends<{ _def: { shape: () => { type: ZodLiteral<Literal> } } }>
  >,
  Options
>;

const showedErrorsRef = {
  actionIds: new Set<string>(),
};

function runCallbackIfMatching<
  Event extends Notifications.Notification | Notifications.NotificationResponse
>({
  type,
  data,
  callback,
  schema,
  printZodError,
  id,
  event,
}: {
  // null matches any type.
  type: string | null;
  data: unknown;
  event: Event;
  callback: (data: unknown, event: Event) => void;
  schema: ZodDiscriminatedUnion<any, any>;
  printZodError: boolean;
  id: string;
}) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    if (printZodError && !showedErrorsRef.actionIds.has(id)) {
      showedErrorsRef.actionIds.add(id);
      console.log(parsed.error.flatten());
    }
    return;
  }
  if (parsed.data.type === type || type === null) {
    callback(parsed.data, event);
  }
}

export type CreateZodNotificationHandlerOptions = {
  showErrors?: boolean;
};

export type DiscriminatorValuesFromOptions<Options extends DiscUnionOptions> =
  ReturnType<Options[number]['_def']['shape']>['type']['_def']['value'];

export function createZodNotificationHandlers<Options extends DiscUnionOptions>(
  schema: Options,
  options?: CreateZodNotificationHandlerOptions
) {
  const union = z.discriminatedUnion('type', schema);

  const defaultOptions: CreateZodNotificationHandlerOptions = {
    showErrors: true,
  };
  const mergedOptions: CreateZodNotificationHandlerOptions = {
    ...defaultOptions,
    ...options,
  };
  type DiscriminatorValues = DiscriminatorValuesFromOptions<Options>;

  return {
    useNotificationReceived: <Type extends DiscriminatorValues>(
      type: Type,
      callback: (
        data: z.infer<FindOption<Type, Options>>['payload'],
        event: Notifications.Notification
      ) => void
    ) => {
      const callbackRef = useRef(callback);
      callbackRef.current = callback;
      useEffect(() => {
        const listener = Notifications.addNotificationReceivedListener(
          (event) => {
            const { data } = event.request.content;
            runCallbackIfMatching({
              type,
              data,
              callback: callbackRef.current as any,
              schema: union,
              printZodError: !!mergedOptions.showErrors,
              id: event.request.identifier,
              event,
            });
          }
        );
        return () => listener.remove();
      }, [type]);
    },
    useNotificationResponse: <Type extends DiscriminatorValues>(
      type: Type,
      callback: (
        data: z.infer<FindOption<Type, Options>>['payload'],
        event: Notifications.NotificationResponse
      ) => void
    ) => {
      const callbackRef = useRef(callback);
      callbackRef.current = callback;
      useEffect(() => {
        const listener = Notifications.addNotificationResponseReceivedListener(
          (event) => {
            const { data } = event.notification.request.content;
            runCallbackIfMatching({
              type,
              data,
              callback: callbackRef.current as any,
              schema: union,
              printZodError: !!mergedOptions.showErrors,
              id: event.notification.request.identifier,
              event,
            });
          }
        );
        return () => listener.remove();
      }, [type]);
    },
  };
}
