Work in progress - library not ready for use.

# zod-expo-notifications

![Screenshot 2023-05-28 at 4 02 39 PM](https://github.com/iway1/zod-expo-notifications/assets/12774588/13220c24-b251-4259-846f-4dd4268d2d32)
![Screenshot 2023-05-28 at 4 02 58 PM](https://github.com/iway1/zod-expo-notifications/assets/12774588/5e89ad85-df4f-4762-bfea-9f959846615f)


Easily create typesafe notification handlers using zod.

- 🧙 Runtime and compile time typesafety using zod with minimal overhead
- 🌯 Thin wrapper around `expo-notifications` to prevent boilerplate (you might not need to use `expo-notifications` directly
- 👍 Standardize approach to handling push notifications

## Installation

```sh
expo install expo-notifications zod-expo-notifications zod
```

## Usage

First, define your push notifications using `createZodNotificationHandlers()`. 

Pass an array of zod objects each with a type property (and optionally a payload):

```tsx
const { useNotificationReceived, useNotificationResponse } =
  createZodNotificationHandlers([
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
```

Each object must have a `type` as well as an optional `payload` that will be available in the callback function. Then, in your components use the exported hooks:

```tsx
import {useNotificationReceived} from '~/push-notifications'

export function MyScreen() {
  useNotificationReceived('friend-request', (payload)=>{
    // Typesafe payload is passed to callback
    payload.friendId; 
  })
  // ...
}
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
