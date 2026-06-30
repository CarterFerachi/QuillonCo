/* QuillonCo Theme JavaScript */

(function() {
  'use strict';

  // =========================================
  // Header scroll behavior
  // =========================================
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // =========================================
  // Mobile navigation
  // =========================================
  const mobileToggle = document.querySelector('.header-mobile-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileClose = document.querySelector('.mobile-nav__close');
  const siteOverlay = document.getElementById('overlay');

  function openMobileNav() {
    if (!mobileNav) return;
    mobileNav.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (siteOverlay) siteOverlay.classList.add('is-active');
  }

  function closeMobileNav() {
    if (!mobileNav) return;
    mobileNav.classList.remove('is-open');
    document.body.style.overflow = '';
    if (siteOverlay) siteOverlay.classList.remove('is-active');
  }

  if (mobileToggle) mobileToggle.addEventListener('click', openMobileNav);
  if (mobileClose) mobileClose.addEventListener('click', closeMobileNav);
  if (siteOverlay) siteOverlay.addEventListener('click', closeMobileNav);

  // =========================================
  // Cart Drawer
  // =========================================
  const cartDrawer = document.getElementById('cart-drawer');
  const cartDrawerClose = document.querySelector('.cart-drawer__close');
  const cartDrawerOverlay = document.querySelector('.cart-drawer__overlay');
  const cartDrawerBody = document.getElementById('cart-drawer-body');
  const cartDrawerSubtotal = document.getElementById('cart-drawer-subtotal');
  const cartDrawerCount = document.getElementById('cart-drawer-count');

  function openCartDrawer() {
    if (!cartDrawer) return;
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    refreshCartDrawer();
  }

  function closeCartDrawer() {
    if (!cartDrawer) return;
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (cartDrawerClose) cartDrawerClose.addEventListener('click', closeCartDrawer);
  if (cartDrawerOverlay) cartDrawerOverlay.addEventListener('click', closeCartDrawer);

  function formatMoney(cents) {
    const dollars = cents / 100;
    return '$' + dollars.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function refreshCartDrawer() {
    if (!cartDrawerBody) return;
    fetch('/cart.js')
      .then(r => r.json())
      .then(cart => {
        updateCartUI(cart);
      })
      .catch(console.error);
  }

  function updateCartUI(cart) {
    // Update count badges
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = cart.item_count;
    });
    if (cartDrawerCount) cartDrawerCount.textContent = cart.item_count;

    // Update body badge
    document.body.dataset.cartCount = cart.item_count;

    // Update subtotal
    if (cartDrawerSubtotal) cartDrawerSubtotal.textContent = formatMoney(cart.total_price);

    // Update cart count in header
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = cart.item_count;
      el.style.display = cart.item_count > 0 ? 'flex' : 'none';
    });

    // Render items
    if (!cartDrawerBody) return;

    if (cart.item_count === 0) {
      cartDrawerBody.innerHTML = `
        <div class="cart-drawer__empty">
          <svg class="cart-drawer__empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <h3>Your bag is empty</h3>
          <p>Discover our collection of southern-crafted polo shirts.</p>
          <a href="/collections/all" class="btn btn--primary">Shop Now</a>
        </div>
      `;
      return;
    }

    const itemsHTML = cart.items.map(item => `
      <div class="cart-item" data-line-item="${item.key}">
        <img src="${item.image}" alt="${item.title}" class="cart-item__image" loading="lazy" width="80" height="100">
        <div class="cart-item__details">
          <div class="cart-item__title">${item.product_title}</div>
          <div class="cart-item__variant">${item.variant_title !== 'Default Title' ? item.variant_title : ''}</div>
          <div class="cart-item__price-row">
            <span class="cart-item__price">${formatMoney(item.final_line_price)}</span>
            <div class="cart-item__qty">
              <button data-qty-minus data-key="${item.key}" aria-label="Decrease quantity">&#8722;</button>
              <span>${item.quantity}</span>
              <button data-qty-plus data-key="${item.key}" aria-label="Increase quantity">&#43;</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    cartDrawerBody.innerHTML = itemsHTML;

    // Bind qty controls
    cartDrawerBody.querySelectorAll('[data-qty-minus]').forEach(btn => {
      btn.addEventListener('click', () => updateLineItem(btn.dataset.key, -1));
    });
    cartDrawerBody.querySelectorAll('[data-qty-plus]').forEach(btn => {
      btn.addEventListener('click', () => updateLineItem(btn.dataset.key, 1));
    });
  }

  function updateLineItem(key, delta) {
    fetch('/cart.js')
      .then(r => r.json())
      .then(cart => {
        const item = cart.items.find(i => i.key === key);
        if (!item) return;
        const newQty = Math.max(0, item.quantity + delta);
        return fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity: newQty })
        });
      })
      .then(r => r && r.json())
      .then(cart => cart && updateCartUI(cart))
      .catch(console.error);
  }

  // =========================================
  // Add to Cart (delegated)
  // =========================================
  document.addEventListener('submit', function(e) {
    const form = e.target.closest('[data-add-to-cart-form]');
    if (!form) return;
    e.preventDefault();

    const btn = form.querySelector('[data-add-to-cart]');
    if (btn) {
      btn.classList.add('is-loading');
      btn.innerHTML = '<span class="loading-spinner"></span>';
    }

    const formData = new FormData(form);
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: formData.get('id'),
        quantity: parseInt(formData.get('quantity') || '1')
      })
    })
    .then(r => r.json())
    .then(() => {
      if (btn) {
        btn.classList.remove('is-loading');
        btn.textContent = 'Added!';
        setTimeout(() => { btn.textContent = 'Add to Bag'; }, 1800);
      }
      openCartDrawer();
    })
    .catch(err => {
      console.error(err);
      if (btn) {
        btn.classList.remove('is-loading');
        btn.textContent = 'Add to Bag';
      }
    });
  });

  // Cart icon trigger
  document.querySelectorAll('[data-open-cart]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); openCartDrawer(); });
  });

  // =========================================
  // Product Gallery thumbnails
  // =========================================
  const galleryMain = document.querySelector('.product-gallery__main img');
  document.querySelectorAll('.product-gallery__thumb').forEach(thumb => {
    thumb.addEventListener('click', function() {
      document.querySelectorAll('.product-gallery__thumb').forEach(t => t.classList.remove('is-active'));
      this.classList.add('is-active');
      if (galleryMain) {
        const src = this.querySelector('img')?.src;
        if (src) galleryMain.src = src;
      }
    });
  });

  // =========================================
  // Size option selection
  // =========================================
  document.querySelectorAll('.size-option').forEach(option => {
    option.addEventListener('click', function() {
      if (this.classList.contains('is-unavailable')) return;
      const group = this.closest('.size-options');
      group.querySelectorAll('.size-option').forEach(o => o.classList.remove('is-selected'));
      this.classList.add('is-selected');
      // Update hidden variant input
      const variantId = this.dataset.variantId;
      const variantInput = document.querySelector('[name="id"]');
      if (variantInput && variantId) variantInput.value = variantId;
    });
  });

  // =========================================
  // Newsletter form
  // =========================================
  document.querySelectorAll('.newsletter__form').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;
      const btn = this.querySelector('button[type="submit"]');
      if (!email) return;
      if (btn) { btn.textContent = 'Subscribed!'; btn.disabled = true; }
    });
  });

  // =========================================
  // Lazy load images
  // =========================================
  if ('IntersectionObserver' in window) {
    const imgObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          imgObserver.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });

    document.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));
  }

  // =========================================
  // Escape key handlers
  // =========================================
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeCartDrawer();
      closeMobileNav();
    }
  });

})();
