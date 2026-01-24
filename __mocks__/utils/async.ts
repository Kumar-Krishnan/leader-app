/**
 * Async Test Utilities
 *
 * Helper functions for handling async operations in tests
 */

/**
 * Wait for async operations to complete
 * Uses setTimeout to push to the end of the event queue
 *
 * @example
 * ```tsx
 * fireEvent.press(button);
 * await waitForAsync();
 * expect(mockFn).toHaveBeenCalled();
 * ```
 */
export const waitForAsync = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Flush all pending promises
 * Uses setImmediate to wait for all microtasks
 *
 * @example
 * ```tsx
 * fireEvent.press(button);
 * await flushPromises();
 * expect(element).toBeVisible();
 * ```
 */
export const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

/**
 * Wait for a specific amount of time
 *
 * @example
 * ```tsx
 * fireEvent.press(button);
 * await delay(100);
 * expect(animation).toBeComplete();
 * ```
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for a condition to be true
 *
 * @example
 * ```tsx
 * await waitForCondition(() => element.props.visible === true);
 * ```
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await delay(interval);
  }
}

/**
 * Create a deferred promise for manual control
 *
 * @example
 * ```tsx
 * const { promise, resolve, reject } = createDeferred<string>();
 * mockFn.mockReturnValue(promise);
 * fireEvent.press(button);
 * resolve('success');
 * await waitFor(() => expect(screen.getByText('success')).toBeTruthy());
 * ```
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
} {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: Error) => void = () => {};

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Run fake timers and flush promises
 * Useful when testing code with both timers and promises
 *
 * @example
 * ```tsx
 * jest.useFakeTimers();
 * fireEvent.press(button);
 * await advanceTimersAndFlush(1000);
 * expect(callback).toHaveBeenCalled();
 * ```
 */
export async function advanceTimersAndFlush(ms: number): Promise<void> {
  jest.advanceTimersByTime(ms);
  await flushPromises();
}

/**
 * Create a mock that resolves after a delay
 * Useful for simulating network latency
 *
 * @example
 * ```tsx
 * mockApi.mockImplementation(createDelayedMock(100, { data: 'result' }));
 * ```
 */
export function createDelayedMock<T>(ms: number, value: T): () => Promise<T> {
  return () => new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Create a mock that rejects after a delay
 *
 * @example
 * ```tsx
 * mockApi.mockImplementation(createDelayedReject(100, new Error('Network error')));
 * ```
 */
export function createDelayedReject(ms: number, error: Error): () => Promise<never> {
  return () => new Promise((_, reject) => setTimeout(() => reject(error), ms));
}
