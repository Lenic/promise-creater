## 简言

自己实现的 Promise 类库，通过了 Promise/A+ 的标准测试。

过程中参考了 [MPromise](https://github.com/git-lt/MPromise) 的实现，后面根据自己的理解使用 ES6 的方式实现。

核心代码在 `core.es6` 中，比用 ES5 的方式更容易理解，所以后面删除了参考 MPromise 实现的代码。

感谢 MPromise 的大公无私，使我快速的理解透彻 Promise 的原理，让我在以后的使用中更清楚、明白，谢谢你！

## 说明文档

在 ES6 中，写法类似后端的 C#、Java，有了 Class 的概念，有了静态方法和实例方法，相比 ES5 中的 `call`、`apply` 和 `bind` 更明确了上下文。

### 静态方法

- [all](#all)
- [race](#race)
- sequence
- resolve
- reject
- timeout
- stop
- defer/deferred

### 实例方法

- catch
- wait

### 核心方法 —— `then`

该方法给当前的 Promise 实例中添加回调方法，两个参数为成功的回调方法和失败的回调方法：

- 成功的回调方法，参数为 Promise 实例成功执行的结果。
- 失败的回调方法，参数为 Promise 实例执行过程中抛出的错误信息。
- 返回值为**新的** Promise 实例，以当前执行方法的结果作为输入。
- 成功的回调方法，执行的过程中发生错误，会调用失败的回调方法处理错误信息，但 `setTimeout` 等异步执行的代码不会被捕获。
- 执行的过程中发生错误，必须使用 `throw` 关键字抛出；否则认为执行成功。

### 静态方法说明

#### all

用于等待输入的多个 Promise 全部完成后才执行的方法，参数为 Promise 对象的数组，返回值为新的 Promise 实例。

- 输入的多个 Promise 实例**全部**执行成功，后续的 `then` 方法会以这些 Promise 实例的返回值作为参数传递给后续的 `then` 方法：参数数组的顺序和传入的 Promise 实例数组顺序相同，与 Promise 执行完成的先后顺序无关。
- 多个 Promise 实例中，任何一个 Promise 执行失败，立即**队列执行**后续的 `then` 方法失败的回调方法参数：以此失败信息为参数。

```js
var promise = Promise.all([promise1, promise2, ...])
```

#### race

用于等待多个 Promise 实例中执行最快的实例，然后执行后续的 `then` 方法，参数为这个最快 Promise 实例的返回值。

- 执行最快的实例，执行成功：调用后续的 `then` 方法的成功的回调方法，参数为执行最快实例的执行结果。
- 执行最快的实例，执行失败：调用后续的 `then` 方法的失败的回调方法，参数为执行最快实例的错误原因。

```js
var promise = Promise.race([promise1, promise2, ...])
```
