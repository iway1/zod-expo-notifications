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

function runCallbackIfMatching({
  type,
  data,
  callback,
  schema,
  printZodError,
  id,
}: {
  type: string;
  data: unknown;
  callback: (data: unknown) => void;
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
  if (parsed.data.type === type) {
    callback(parsed.data);
  }
}

export type CreateZodNotificationHandlerOptions = {
  showErrors?: boolean;
};

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
  type DiscriminatorValues = ReturnType<
    Options[number]['_def']['shape']
  >['type']['_def']['value'];

  return {
    useNotificationReceived: <Type extends DiscriminatorValues>(
      type: Type,
      callback: (data: z.infer<FindOption<Type, Options>>['payload']) => void
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
            });
          }
        );
        return () => listener.remove();
      }, [type]);
    },
    useNotificationResponse: <Type extends DiscriminatorValues>(
      type: Type,
      callback: (data: z.infer<FindOption<Type, Options>>['payload']) => void
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
            });
          }
        );
        return () => listener.remove();
      }, [type]);
    },
  };
}

const { useNotificationReceived } = createZodNotificationHandlers([
  z.object({
    type: z.literal('post-liked'),
    payload: z.object({
      postId: z.string(),
    }),
  }),
  z.object({
    type: z.literal('friend-request'),
    payload: z.object({
      friendId: z.string(),
    }),
  }),
]);

useNotificationReceived('post-liked', (data) => {
  data.postId;
});
