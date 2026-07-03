/* ==========================================================================
   QuillonCo — global.js
   Vanilla JS custom elements. No dependencies.
   ========================================================================== */

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function formatMoney(cents, format) {
  const value = (cents / 100).toFixed(2);
  const template = format || window.theme?.moneyFormat || '${{amount}}';
  return template
    .replace(/\{\{\s*amount\s*\}\}/, Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 }))
    .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100).toLocaleString())
    .replace(/<[^>]*>/g, '');
}

function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

/* --------------------------------------------------------------------------
   Scroll reveal
   -------------------------------------------------------------------------- */
function initScrollTriggers(scope = document) {
  const items = scope.querySelectorAll('.scroll-trigger:not(.scroll-trigger--visible)');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('scroll-trigger--visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-trigger--visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );
  items.forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => initScrollTriggers());
document.addEventListener('shopify:section:load', (e) => initScrollTriggers(e.target));

/* --------------------------------------------------------------------------
   Sticky header (hide on scroll down, reveal on scroll up)
   -------------------------------------------------------------------------- */
class StickyHeader extends HTMLElement {
  connectedCallback() {
    this.lastScroll = 0;
    this.onScroll = this.onScroll.bind(this);
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.onScroll);
  }

  onScroll() {
    const y = window.scrollY;
    this.classList.toggle('header--scrolled', y > 24);
    if (y > 400 && y > this.lastScroll + 8 && !this.querySelector('details[open]')) {
      this.classList.add('header--hidden');
    } else if (y < this.lastScroll - 4 || y < 400) {
      this.classList.remove('header--hidden');
    }
    this.lastScroll = y;
  }
}
customElements.define('sticky-header', StickyHeader);

/* --------------------------------------------------------------------------
   Details disclosure (desktop dropdown / mega menu)
   -------------------------------------------------------------------------- */
class HeaderMenu extends HTMLElement {
  connectedCallback() {
    this.details = this.querySelector('details');
    if (!this.details) return;
    this.summary = this.details.querySelector('summary');

    this.addEventListener('mouseenter', () => this.toggle(true));
    this.addEventListener('mouseleave', () => this.toggle(false));
    this.summary.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggle(!this.details.open);
    });
    document.addEventListener('click', (e) => {
      if (this.details.open && !this.contains(e.target)) this.toggle(false);
    });
    this.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') this.toggle(false);
    });
  }

  toggle(open) {
    if (open) {
      this.details.setAttribute('open', '');
      this.summary.setAttribute('aria-expanded', 'true');
    } else {
      this.details.removeAttribute('open');
      this.summary.setAttribute('aria-expanded', 'false');
    }
  }
}
customElements.define('header-menu', HeaderMenu);

/* --------------------------------------------------------------------------
   Generic drawer (cart / search / mobile menu / facets)
   -------------------------------------------------------------------------- */
class DrawerElement extends HTMLElement {
  connectedCallback() {
    this.querySelectorAll('[data-drawer-close]').forEach((el) =>
      el.addEventListener('click', () => this.close())
    );
    this.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') this.close();
    });
    trapFocus(this);
  }

  open(trigger) {
    this.trigger = trigger || document.activeElement;
    this.classList.add('is-open');
    this.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    const focusTarget = this.querySelector('[data-drawer-focus]') || this.querySelector('button, input, a');
    if (focusTarget) setTimeout(() => focusTarget.focus(), 150);
    this.dispatchEvent(new CustomEvent('drawer:open'));
  }

  close() {
    this.classList.remove('is-open');
    this.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (this.trigger && typeof this.trigger.focus === 'function') this.trigger.focus();
    this.dispatchEvent(new CustomEvent('drawer:close'));
  }
}
customElements.define('drawer-element', DrawerElement);

document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-drawer-open]');
  if (!opener) return;
  const drawer = document.getElementById(opener.dataset.drawerOpen);
  if (drawer && typeof drawer.open === 'function') {
    e.preventDefault();
    drawer.open(opener);
  }
});

/* --------------------------------------------------------------------------
   Cart API + cart drawer
   -------------------------------------------------------------------------- */
const CartAPI = {
  async add(items) {
    const response = await fetch(`${window.routes.cart_add_url}.js`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.description || window.theme.strings.cartError);
    }
    await this.refreshDrawer();
    return response.json();
  },

  async change(line, quantity) {
    const response = await fetch(`${window.routes.cart_change_url}.js`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line, quantity }),
    });
    if (!response.ok) throw new Error(window.theme.strings.cartError);
    await this.refreshDrawer();
    return response.json();
  },

  async refreshDrawer() {
    const drawer = document.getElementById('CartDrawer');
    const response = await fetch(`${window.routes.root_url}?sections=cart-drawer`);
    const sections = await response.json();
    if (sections['cart-drawer'] && drawer) {
      const dom = new DOMParser().parseFromString(sections['cart-drawer'], 'text/html');
      const fresh = dom.querySelector('#CartDrawerContent');
      const current = drawer.querySelector('#CartDrawerContent');
      if (fresh && current) current.replaceWith(fresh);
      const freshCount = dom.querySelector('[data-cart-count]');
      document.querySelectorAll('.header [data-cart-count-wrapper]').forEach((wrapper) => {
        const bubble = wrapper.querySelector('[data-cart-count]');
        if (freshCount) {
          if (bubble) {
            bubble.textContent = freshCount.textContent;
            bubble.hidden = freshCount.textContent.trim() === '0';
          }
        }
      });
      document.dispatchEvent(new CustomEvent('cart:refreshed'));
    }
  },

  openDrawer() {
    const drawer = document.getElementById('CartDrawer');
    if (drawer && typeof drawer.open === 'function') drawer.open();
  },
};
window.CartAPI = CartAPI;

class CartItems extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', (e) => {
      const remove = e.target.closest('[data-cart-remove]');
      if (remove) {
        e.preventDefault();
        this.updateLine(Number(remove.dataset.line), 0);
      }
    });
    this.addEventListener('change', (e) => {
      const input = e.target.closest('[data-line-quantity]');
      if (input) this.updateLine(Number(input.dataset.line), Number(input.value));
    });
  }

  async updateLine(line, quantity) {
    this.classList.add('cart--loading');
    try {
      const cart = await CartAPI.change(line, quantity);
      if (this.dataset.context === 'page') {
        window.location.reload();
      }
      if (cart.item_count === 0 && this.dataset.context === 'page') window.location.reload();
    } catch (err) {
      console.error(err);
      this.classList.remove('cart--loading');
    }
  }
}
customElements.define('cart-items', CartItems);

/* --------------------------------------------------------------------------
   Product form (add to cart)
   -------------------------------------------------------------------------- */
class ProductForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    if (!this.form) return;
    this.button = this.form.querySelector('[type="submit"]');
    this.form.addEventListener('submit', this.onSubmit.bind(this));
  }

  async onSubmit(e) {
    e.preventDefault();
    if (this.button.hasAttribute('disabled')) return;
    const idInput = this.form.querySelector('[name="id"]');
    const qtyInput = this.form.querySelector('[name="quantity"]');
    this.button.setAttribute('aria-busy', 'true');
    try {
      await CartAPI.add([
        { id: Number(idInput.value), quantity: qtyInput ? Number(qtyInput.value) : 1 },
      ]);
      CartAPI.openDrawer();
    } catch (err) {
      const message = this.querySelector('[data-form-error]');
      if (message) {
        message.textContent = err.message;
        message.hidden = false;
        setTimeout(() => (message.hidden = true), 5000);
      }
    } finally {
      this.button.removeAttribute('aria-busy');
    }
  }
}
customElements.define('product-form', ProductForm);

/* --------------------------------------------------------------------------
   Quick add (product cards)
   -------------------------------------------------------------------------- */
class QuickAdd extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', async (e) => {
      const button = e.target.closest('[data-variant-id]');
      if (!button || button.disabled) return;
      e.preventDefault();
      button.setAttribute('aria-busy', 'true');
      try {
        await CartAPI.add([{ id: Number(button.dataset.variantId), quantity: 1 }]);
        CartAPI.openDrawer();
      } catch (err) {
        console.error(err);
      } finally {
        button.removeAttribute('aria-busy');
      }
    });
  }
}
customElements.define('quick-add', QuickAdd);

/* --------------------------------------------------------------------------
   Quantity input
   -------------------------------------------------------------------------- */
class QuantityInput extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input');
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const previous = Number(this.input.value);
        if (button.name === 'plus') this.input.value = previous + 1;
        if (button.name === 'minus') this.input.value = Math.max(Number(this.input.min || 1), previous - 1);
        if (Number(this.input.value) !== previous) {
          this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })
    );
  }
}
customElements.define('quantity-input', QuantityInput);

/* --------------------------------------------------------------------------
   Predictive search
   -------------------------------------------------------------------------- */
class PredictiveSearch extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input[type="search"]');
    this.results = this.querySelector('[data-predictive-results]');
    if (!this.input || !this.results) return;
    this.input.addEventListener('input', debounce(() => this.search(), 250));
  }

  async search() {
    const query = this.input.value.trim();
    if (query.length < 2) {
      this.results.innerHTML = '';
      return;
    }
    try {
      const url = `${window.routes.predictive_search_url}?q=${encodeURIComponent(
        query
      )}&resources[type]=product&resources[limit]=6&section_id=predictive-search`;
      const response = await fetch(url);
      if (!response.ok) return;
      const text = await response.text();
      const dom = new DOMParser().parseFromString(text, 'text/html');
      const inner = dom.querySelector('#PredictiveSearchResults');
      if (inner) this.results.innerHTML = inner.innerHTML;
    } catch (err) {
      console.error(err);
    }
  }
}
customElements.define('predictive-search', PredictiveSearch);

/* --------------------------------------------------------------------------
   Hero parallax (subtle)
   -------------------------------------------------------------------------- */
class ParallaxMedia extends HTMLElement {
  connectedCallback() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.media = this.querySelector('img, video');
    if (!this.media) return;
    this.onScroll = this.onScroll.bind(this);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.onScroll);
  }

  onScroll() {
    const rect = this.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const progress = rect.top / window.innerHeight;
    this.media.style.transform = `scale(1.08) translateY(${progress * -3}%)`;
  }
}
customElements.define('parallax-media', ParallaxMedia);

/* --------------------------------------------------------------------------
   Modal (size guide, etc.)
   -------------------------------------------------------------------------- */
class ModalDialog extends HTMLElement {
  connectedCallback() {
    this.querySelectorAll('[data-modal-close]').forEach((el) =>
      el.addEventListener('click', () => this.close())
    );
    this.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  open(trigger) {
    this.trigger = trigger;
    this.classList.add('is-open');
    document.body.classList.add('no-scroll');
    trapFocus(this);
    const closeButton = this.querySelector('[data-modal-close]');
    if (closeButton) closeButton.focus();
  }

  close() {
    this.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    if (this.trigger) this.trigger.focus();
  }
}
customElements.define('modal-dialog', ModalDialog);

document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-modal-open]');
  if (!opener) return;
  const modal = document.getElementById(opener.dataset.modalOpen);
  if (modal && typeof modal.open === 'function') {
    e.preventDefault();
    modal.open(opener);
  }
});

/* --------------------------------------------------------------------------
   Facets (collection filtering via Section Rendering API)
   -------------------------------------------------------------------------- */
class FacetFilters extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    if (!this.form) return;
    this.sectionId = this.dataset.sectionId;
    this.form.addEventListener('change', debounce(() => this.applyFilters(), 300));
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.applyFilters();
    });
  }

  buildUrl() {
    const formData = new FormData(this.form);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (value !== '') params.append(key, value);
    }
    return `${window.location.pathname}?${params.toString()}`;
  }

  async applyFilters() {
    const url = this.buildUrl();
    const grid = document.getElementById('CollectionProductGrid');
    if (grid) grid.classList.add('cart--loading');
    try {
      const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}section_id=${this.sectionId}`);
      const text = await response.text();
      const dom = new DOMParser().parseFromString(text, 'text/html');
      ['CollectionProductGrid', 'FacetsActive', 'FacetsCount'].forEach((id) => {
        const fresh = dom.getElementById(id);
        const current = document.getElementById(id);
        if (fresh && current) current.innerHTML = fresh.innerHTML;
      });
      window.history.replaceState({}, '', url);
      initScrollTriggers(document.getElementById('CollectionProductGrid') || document);
    } catch (err) {
      console.error(err);
    } finally {
      if (grid) grid.classList.remove('cart--loading');
    }
  }
}
customElements.define('facet-filters', FacetFilters);

document.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-remove-facet]');
  if (!chip) return;
  e.preventDefault();
  window.location.href = chip.getAttribute('href');
});
