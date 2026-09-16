/**
 * 测试环境垫片：jsdom 缺少 Radix UI 等组件依赖的浏览器 API。
 * node 环境下（纯逻辑测试）不做任何处理。
 */
if (typeof window !== "undefined") {
  if (!("ResizeObserver" in globalThis)) {
    class ResizeObserverStub {
      observe() { }
      unobserve() { }
      disconnect() { }
    }
    Object.assign(globalThis, { ResizeObserver: ResizeObserverStub });
  }
  if (!window.matchMedia) {
    Object.assign(window, {
      matchMedia: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => { },
        removeEventListener: () => { },
        addListener: () => { },
        removeListener: () => { },
        dispatchEvent: () => false,
      }),
    });
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => { };
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => { };
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => { };
}
