/* ==========================================================================
   QuillonCo — product.js
   Variant selection, media gallery, zoom, sticky ATC, recently viewed.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Variant picker
   -------------------------------------------------------------------------- */
class VariantPicker extends HTMLElement {
  connectedCallback() {
    const dataScript = this.querySelector('[data-product-json]');
    if (!dataScript) return;
    this.product = JSON.parse(dataScript.textContent);
    this.sectionId = this.dataset.sectionId;
    this.addEventListener('change', this.onVariantChange.bind(this));
  }

  get selectedOptions() {
    return Array.from(this.querySelectorAll('input[type="radio"]:checked, select')).map(
      (el) => el.value
    );
  }

  onVariantChange() {
    const options = this.selectedOptions;
    const variant = this.product.variants.find((v) =>
      v.options.every((option, index) => option === options[index])
    );
    this.updateSelectedLabels();
    this.updateAvailability(options);
    this.dispatchVariant(variant);
    if (variant) {
      this.updateUrl(variant);
      this.updateIdInputs(variant);
      this.updatePrice(variant);
      this.updateButtons(variant);
      this.updateMedia(variant);
    } else {
      this.updateButtons(null);
    }
  }

  updateSelectedLabels() {
    this.querySelectorAll('[data-option-index]').forEach((label) => {
      const index = Number(label.dataset.optionIndex);
      label.textContent = this.selectedOptions[index] || '';
    });
  }

  updateAvailability(options) {
    this.querySelectorAll('fieldset').forEach((fieldset, fieldsetIndex) => {
      fieldset.querySelectorAll('input[type="radio"]').forEach((input) => {
        const testOptions = [...options];
        testOptions[fieldsetIndex] = input.value;
        const match = this.product.variants.find((v) =>
          v.options.every((option, i) => option === testOptions[i])
        );
        input.classList.toggle('disabled', !match || !match.available);
      });
    });
  }

  updateUrl(variant) {
    if (!this.dataset.updateUrl) return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${variant.id}`);
  }

  updateIdInputs(variant) {
    document.querySelectorAll(`#ProductInfo-${this.sectionId} input[name="id"], #StickyAtc-${this.sectionId} input[name="id"]`).forEach((input) => {
      input.value = variant.id;
    });
  }

  updatePrice(variant) {
    document.querySelectorAll(`[data-price-wrapper="${this.sectionId}"]`).forEach((wrapper) => {
      const priceEl = wrapper.querySelector('[data-price]');
      const compareEl = wrapper.querySelector('[data-compare-price]');
      if (priceEl) priceEl.textContent = formatMoney(variant.price);
      if (compareEl) {
        const onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
        compareEl.hidden = !onSale;
        if (onSale) compareEl.textContent = formatMoney(variant.compare_at_price);
        if (priceEl) priceEl.classList.toggle('price__sale', Boolean(onSale));
      }
    });
  }

  updateButtons(variant) {
    document.querySelectorAll(`#ProductInfo-${this.sectionId} [type="submit"], #StickyAtc-${this.sectionId} [type="submit"]`).forEach((button) => {
      const label = button.querySelector('.button__label') || button;
      if (!variant) {
        button.setAttribute('disabled', '');
        label.textContent = window.theme.strings.unavailable;
      } else if (!variant.available) {
        button.setAttribute('disabled', '');
        label.textContent = window.theme.strings.soldOut;
      } else {
        button.removeAttribute('disabled');
        label.textContent = window.theme.strings.addToCart;
      }
    });
  }

  updateMedia(variant) {
    if (!variant.featured_media) return;
    const item = document.querySelector(`[data-media-id="${this.sectionId}-${variant.featured_media.id}"]`);
    if (!item) return;
    const gallery = item.closest('.product__media-list');
    if (window.matchMedia('(max-width: 749px)').matches && gallery) {
      gallery.scrollTo({ left: item.offsetLeft - gallery.offsetLeft, behavior: 'smooth' });
    } else {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  dispatchVariant(variant) {
    document.dispatchEvent(new CustomEvent('variant:changed', { detail: { variant } }));
  }
}
customElements.define('variant-picker', VariantPicker);

/* --------------------------------------------------------------------------
   Media gallery zoom
   -------------------------------------------------------------------------- */
class MediaGallery extends HTMLElement {
  connectedCallback() {
    this.modal = document.getElementById(`ZoomModal-${this.dataset.sectionId}`);
    if (!this.modal) return;
    this.modalImage = this.modal.querySelector('img');
    this.addEventListener('click', (e) => {
      const media = e.target.closest('[data-zoom-src]');
      if (!media) return;
      this.modalImage.src = media.dataset.zoomSrc;
      this.modalImage.srcset = '';
      this.modal.classList.add('is-open');
      document.body.classList.add('no-scroll');
    });
    this.modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-zoom-close]') || e.target === this.modalImage) {
        this.modal.classList.remove('is-open');
        document.body.classList.remove('no-scroll');
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('is-open')) {
        this.modal.classList.remove('is-open');
        document.body.classList.remove('no-scroll');
      }
    });
  }
}
customElements.define('media-gallery', MediaGallery);

/* --------------------------------------------------------------------------
   Sticky add-to-cart bar
   -------------------------------------------------------------------------- */
class StickyAtc extends HTMLElement {
  connectedCallback() {
    this.anchor = document.getElementById(this.dataset.anchor);
    if (!this.anchor || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        this.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );
    observer.observe(this.anchor);
  }
}
customElements.define('sticky-atc', StickyAtc);

/* --------------------------------------------------------------------------
   Recently viewed (localStorage)
   -------------------------------------------------------------------------- */
const RECENTLY_VIEWED_KEY = 'quillonco:recently-viewed';

class RecentlyViewedTracker extends HTMLElement {
  connectedCallback() {
    try {
      const product = JSON.parse(this.querySelector('script').textContent);
      const list = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]').filter(
        (item) => item.handle !== product.handle
      );
      list.unshift(product);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list.slice(0, 12)));
    } catch (err) {
      /* localStorage unavailable — ignore */
    }
  }
}
customElements.define('recently-viewed-tracker', RecentlyViewedTracker);

class RecentlyViewed extends HTMLElement {
  connectedCallback() {
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
    } catch (err) {
      /* ignore */
    }
    const exclude = this.dataset.exclude;
    items = items.filter((item) => item.handle !== exclude).slice(0, Number(this.dataset.limit || 4));
    if (!items.length) {
      const section = this.closest('.shopify-section');
      if (section) section.style.display = 'none';
      return;
    }
    const grid = this.querySelector('[data-recently-viewed-grid]');
    grid.innerHTML = items
      .map(
        (item) => `
      <li class="card">
        <div class="card__media media-zoom-hover">
          <div class="media media--portrait">
            <img src="${item.image}" alt="${item.title.replace(/"/g, '&quot;')}" loading="lazy" width="600" height="750">
          </div>
        </div>
        <div class="card__content">
          <h3 class="card__title"><a href="${item.url}">${item.title}</a></h3>
          <div class="card__price"><span class="price">${item.price}</span></div>
        </div>
      </li>`
      )
      .join('');
  }
}
customElements.define('recently-viewed', RecentlyViewed);

/* --------------------------------------------------------------------------
   Product recommendations (Shopify recommendations API)
   -------------------------------------------------------------------------- */
class ProductRecommendations extends HTMLElement {
  connectedCallback() {
    const load = async () => {
      try {
        const response = await fetch(this.dataset.url);
        const text = await response.text();
        const dom = new DOMParser().parseFromString(text, 'text/html');
        const fresh = dom.querySelector('product-recommendations');
        if (fresh && fresh.innerHTML.trim().length) {
          this.innerHTML = fresh.innerHTML;
          if (typeof initScrollTriggers === 'function') initScrollTriggers(this);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries, obs) => {
          if (entries[0].isIntersecting) {
            obs.disconnect();
            load();
          }
        },
        { rootMargin: '400px 0px' }
      );
      observer.observe(this);
    } else {
      load();
    }
  }
}
customElements.define('product-recommendations', ProductRecommendations);
