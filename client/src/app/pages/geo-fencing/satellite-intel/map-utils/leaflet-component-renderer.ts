import { ComponentRef, EnvironmentInjector, Type, createComponent } from '@angular/core';
import { RenderedLeafletComponent } from '../../models/geo-fencing.models';
import type { Nullish } from '../../../../shared/utils/type-guards.util';

export class LeafletComponentRenderer {
  private refs = new Set<ComponentRef<unknown>>();

  constructor(private environmentInjector: EnvironmentInjector) {}

  create<T>(component: Type<T>, inputs: Partial<T>): RenderedLeafletComponent<T> {
    const componentRef = createComponent(component, {
      environmentInjector: this.environmentInjector,
    });

    Object.assign(componentRef.instance as object, inputs);
    componentRef.changeDetectorRef.detectChanges();
    componentRef.changeDetectorRef.detach();
    this.refs.add(componentRef);

    const element = componentRef.location.nativeElement;
    if (!(element instanceof HTMLElement)) {
      throw new TypeError('Expected a rendered component element.');
    }
    return {
      element,
      componentRef,
    };
  }

  elementAsHtml(element: HTMLElement): HTMLElement {
    return element;
  }

  destroy<T>(componentRef: Nullish<ComponentRef<T>>): void {
    if (!componentRef) {
      return;
    }
    this.refs.delete(componentRef);
    componentRef.destroy();
  }

  destroyAll(): void {
    Array.from(this.refs).forEach((componentRef) => {
      this.destroy(componentRef);
    });
  }
}
