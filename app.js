const SUPABASE_URL = 'https://iitmsoaidjsdydbxfhpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpdG1zb2FpZGpzZHlkYnhmaHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MDk2MDcsImV4cCI6MjA3NDM4NTYwN30.GGFzb8lQH-c9Z8a6hYWCyolICvgTK1KJOpDpDmV1nPE';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;

window.signUp = signUp;
window.signIn = signIn;
window.signInWithGoogle = signInWithGoogle;
window.logout = logout;

// ==================== THEME MANAGEMENT ====================
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  if (!document.querySelector('.theme-toggle')) {
    createThemeToggle();
  }
}

function createThemeToggle() {
  const themeToggle = document.createElement('button');
  themeToggle.className = 'theme-toggle';
  themeToggle.setAttribute('aria-label', 'Toggle theme');
  themeToggle.innerHTML = `
    <i class="fas fa-moon"></i>
    <i class="fas fa-sun"></i>
  `;
  themeToggle.onclick = toggleTheme;
  document.body.appendChild(themeToggle);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  showNotification(`Switched to ${newTheme} theme`, 'info');
}

document.addEventListener('DOMContentLoaded', initializeTheme);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTheme);
} else {
  initializeTheme();
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  const text = document.getElementById('notification-text');
  
  if (notification && text) {
    text.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 3000);
  }
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function calculateTier(points) {
  if (points >= 0 && points <= 500) {
    return 'Bronze';
  } else if (points >= 501 && points <= 2000) {
    return 'Silver';
  } else if (points >= 2001 && points <= 5000) {
    return 'Gold';
  } else if (points >= 5001 && points <= 10000) {
    return 'Platinum';
  } else if (points >= 10001) {
    return 'Diamond';
  } else {
    return 'Bronze';
  }
}

function getTierColor(tier) {
  switch(tier) {
    case 'Bronze': return '#cd7f32';
    case 'Silver': return '#c0c0c0';
    case 'Gold': return '#ffd700';
    case 'Platinum': return '#e5e4e2';
    case 'Diamond': return '#b9f2ff';
    default: return '#cd7f32';
  }
}

function getTierBenefits(tier) {
  switch(tier) {
    case 'Bronze': return '1% points on all purchases';
    case 'Silver': return '3% points on all purchases + Priority support';
    case 'Gold': return '5% points on all purchases + Exclusive offers';
    case 'Platinum': return '7% points on all purchases + Premium benefits';
    case 'Diamond': return '10% points on all purchases + VIP treatment';
    default: return '1% points on all purchases';
  }
}

function getNextTier(points) {
  if (points <= 500) return 'Silver';
  if (points <= 2000) return 'Gold';
  if (points <= 5000) return 'Platinum';
  if (points <= 10000) return 'Diamond';
  return null; // Already at highest tier
}

function getPointsForNextTier(points) {
  if (points <= 500) return 501 - points;
  if (points <= 2000) return 2001 - points;
  if (points <= 5000) return 5001 - points;
  if (points <= 10000) return 10001 - points;
  return 0; // Already at highest tier
}

async function signUp() {
  const name = document.getElementById("signup-name")?.value.trim();
  const email = document.getElementById("signup-email")?.value.trim();
  const pass = document.getElementById("signup-password")?.value;
  const pass2 = document.getElementById("signup-password2")?.value;
  const terms = document.getElementById("terms")?.checked;

  if (!name || !email || !pass || !pass2) {
    alert("All fields are required.");
    return;
  }
  
  if (pass !== pass2) {
    alert("Passwords do not match.");
    return;
  }
  
  if (!terms) {
    alert("Please accept the terms and conditions.");
    return;
  }

  try {
    const { data, error } = await db.auth.signUp({ 
      email, 
      password: pass,
      options: {
        data: {
          full_name: name
        }
      }
    });
    
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await db.from("profiles").insert([
        { 
          id: data.user.id, 
          full_name: name, 
          points: 0
        }
      ]);
      
      if (profileError) {
        console.error("Profile creation error:", profileError);
      }
    }

    alert("Account created successfully! Please check your email to verify your account.");
    window.location.href = "signin.html";
  } catch (error) {
    alert("Sign up failed: " + error.message);
  }
}

async function signIn() {
  const email = document.getElementById("signin-email")?.value.trim();
  const pass = document.getElementById("signin-password")?.value;

  if (!email || !pass) {
    alert("Please enter both email and password.");
    return;
  }

  try {
    const { data, error } = await db.auth.signInWithPassword({ 
      email, 
      password: pass 
    });
    
    if (error) throw error;

    currentUser = data.user;
    await ensureProfile();
    window.location.href = "home.html";
  } catch (error) {
    alert("Login failed: " + error.message);
  }
}

async function signInWithGoogle() {
  try {
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin + "/home.html" 
      }
    });
    
    if (error) throw error;
  } catch (error) {
    alert("Google sign-in failed: " + error.message);
  }
}

async function ensureProfile() {
  try {
    const { data: sessionData } = await db.auth.getSession();
    if (!sessionData.session) return;

    const user = sessionData.session.user;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, full_name, points")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      const fullName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'User';
      
      const { error: insertError } = await db.from("profiles").insert([
        { 
          id: user.id, 
          full_name: fullName,
          points: 0
        }
      ]);
      
      if (insertError) {
        console.error("Error creating profile:", insertError);
      }
    }
  } catch (error) {
    console.error("Error ensuring profile:", error);
  }
}

async function logout() {
  try {
    await db.auth.signOut();
    window.location.href = "signin.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
}

async function loadHome() {
  try {
    const { data } = await db.auth.getSession();
    if (!data.session) {
      window.location.href = "signin.html";
      return;
    }

    currentUser = data.session.user;
    await ensureProfile();
    await loadDashboard();
    await loadHomeVouchers();
  } catch (error) {
    console.error("Error loading home:", error);
    window.location.href = "signin.html";
  }
}

async function loadDashboard() {
  try {
    const { data } = await db.auth.getSession();
    if (!data.session) return;
    
    const user = data.session.user;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("full_name, points")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      updateDashboardUI('User', 0, 'Bronze');
      return;
    }

    if (profile) {
      const points = profile.points || 0;
      const tier = calculateTier(points);
      updateDashboardUI(profile.full_name, points, tier);
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
    updateDashboardUI('User', 0, 'Bronze');
  }
}

function updateDashboardUI(fullName, points, tier) {
  const userNameEl = document.getElementById("user-name");
  if (userNameEl) {
    userNameEl.textContent = fullName || 'User';
  }

  const userPointsEl = document.getElementById("user-points");
  if (userPointsEl) {
    userPointsEl.textContent = formatNumber(points);
  }

  const userTierEl = document.getElementById("user-tier");
  if (userTierEl) {
    userTierEl.textContent = tier + " Member";
  }

  const tierBenefitsEl = document.getElementById("tier-benefits");
  if (tierBenefitsEl) {
    tierBenefitsEl.textContent = getTierBenefits(tier);
  }

  const pointsInfoEl = document.getElementById("points-info");
  if (pointsInfoEl) {
    const nextTier = getNextTier(points);
    if (nextTier) {
      const pointsNeeded = getPointsForNextTier(points);
      pointsInfoEl.textContent = `${pointsNeeded} points to ${nextTier}`;
    } else {
      pointsInfoEl.textContent = 'Maximum tier reached!';
    }
  }

  const tierCard = document.getElementById("tier-card");
  if (tierCard) {
    const tierColor = getTierColor(tier);
    tierCard.style.background = `linear-gradient(135deg, ${tierColor}aa 0%, ${tierColor}cc 100%)`;
  }

  const userPointsHeaderEl = document.getElementById("user-points-header");
  if (userPointsHeaderEl) {
    userPointsHeaderEl.textContent = formatNumber(points);
  }
}

function getNextTier(points) {
  if (points <= 100) return 'Silver';
  if (points <= 500) return 'Gold';
  return null;
}

function getPointsForNextTier(points) {
  if (points <= 100) return 101 - points;
  if (points <= 500) return 501 - points;
  return 0;
}

async function addPoints(pointsToAdd) {
  try {
    const { data } = await db.auth.getSession();
    if (!data.session) return;

    const user = data.session.user;

    const { data: profile } = await db
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newPoints = (profile.points || 0) + pointsToAdd;
      
      const { error } = await db
        .from("profiles")
        .update({ points: newPoints })
        .eq("id", user.id);

      if (!error) {
        await loadDashboard();
        showNotification(`${pointsToAdd} points added! New total: ${newPoints}`, 'success');
      }
    }
  } catch (error) {
    console.error("Error adding points:", error);
    showNotification("Error adding points", 'error');
  }
}

function getSampleVouchers() {
  return [
    {
      id: 'sample-1',
      title: "RM5 OFF McDonald's",
      description: "Get RM5 off your next McDonald's purchase with minimum spend of RM15",
      image_url: "https://images.unsplash.com/photo-1551782450-17144efb9c50?w=300&h=200&fit=crop",
      points_required: 250,
      category: "food",
      terms_conditions: "Valid for dine-in, takeaway and McDelivery. Minimum spend RM15. Cannot be combined with other offers.",
      created_at: new Date().toISOString()
    },
    {
      id: 'sample-2',
      title: "Free Starbucks Drink",
      description: "Redeem any Grande sized handcrafted beverage at Starbucks",
      image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&h=200&fit=crop",
      points_required: 800,
      category: "food",
      terms_conditions: "Valid for Grande size handcrafted beverages only. Excludes bottled drinks and food items.",
      created_at: new Date().toISOString()
    },
    {
      id: 'sample-3',
      title: "RM10 OFF Grab Mart",
      description: "Get RM10 off your next GrabMart grocery delivery",
      image_url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=200&fit=crop",
      points_required: 300,
      category: "shopping",
      terms_conditions: "Valid for GrabMart orders only. Minimum spend RM30. Delivery fees apply.",
      created_at: new Date().toISOString()
    }
  ];
}

function getSampleVouchersExtended() {
  return [
    {
      id: 'sample-1',
      title: "RM5 OFF McDonald's",
      description: "Get RM5 off your next McDonald's purchase with minimum spend of RM15",
      image_url: "https://images.unsplash.com/photo-1551782450-17144efb9c50?w=300&h=200&fit=crop",
      points_required: 250,
      category: "food",
      terms_conditions: "Valid for dine-in, takeaway and McDelivery. Minimum spend RM15. Cannot be combined with other offers. Valid at participating outlets only.",
      valid_until: "2024-12-31",
      is_active: true,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'sample-2',
      title: "Free Starbucks Drink",
      description: "Redeem any Grande sized handcrafted beverage at Starbucks",
      image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&h=200&fit=crop",
      points_required: 800,
      category: "food",
      terms_conditions: "Valid for Grande size handcrafted beverages only. Excludes bottled drinks and food items. Valid at participating Starbucks outlets.",
      valid_until: "2024-12-31",
      is_active: true,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'sample-3',
      title: "RM10 OFF Grab Mart",
      description: "Get RM10 off your next GrabMart grocery delivery",
      image_url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=200&fit=crop",
      points_required: 300,
      category: "shopping",
      terms_conditions: "Valid for GrabMart orders only. Minimum spend RM30. Delivery fees apply. Valid in selected areas only.",
      valid_until: "2024-12-31",
      is_active: true,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'sample-4',
      title: "Free Cinema Ticket",
      description: "Redeem one free movie ticket at participating cinemas",
      image_url: "https://images.unsplash.com/photo-1489599511095-0c2c1b6b1f63?w=300&h=200&fit=crop",
      points_required: 1200,
      category: "entertainment",
      terms_conditions: "Valid for standard 2D movies only. Subject to seat availability. Not valid on public holidays.",
      valid_until: "2024-12-31",
      is_active: true,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'sample-5',
      title: "RM15 OFF Grab Car",
      description: "Get RM15 discount on your next Grab ride",
      image_url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop",
      points_required: 400,
      category: "transport",
      terms_conditions: "Valid for GrabCar bookings only. Minimum fare RM20. Valid in Klang Valley only.",
      valid_until: "2024-12-31",
      is_active: true,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'sample-6',
      title: "20% OFF Shopee",
      description: "Get 20% discount on fashion items, max RM25 off",
      image_url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop",
      points_required: 600,
      category: "shopping",
      terms_conditions: "Valid for fashion category only. Maximum discount RM25. Minimum spend RM50.",
      valid_until: "2024-12-31",
      is_active: true,
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function displayVouchers(vouchers, userPoints) {
  const container = document.getElementById("voucher-list");
  if (!container) return;

  container.innerHTML = "";

  if (!vouchers || vouchers.length === 0) {
    container.innerHTML = `
      <div class="no-vouchers">
        <i class="fas fa-gift" style="font-size: 4rem; color: #64748b; margin-bottom: 1.5rem; opacity: 0.7;"></i>
        <p style="color: #94a3b8; font-size: 1.2rem; font-weight: 500; margin-bottom: 0.5rem;">No vouchers available at the moment</p>
        <p style="color: #64748b; font-size: 1rem; opacity: 0.8;">Check back later for new rewards!</p>
      </div>
    `;
    return;
  }

  vouchers.forEach(voucher => {
    const canRedeem = userPoints >= voucher.points_required;
    const card = document.createElement("div");
    card.className = "voucher-card";
    
    const voucherJson = JSON.stringify(voucher).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    card.innerHTML = `
      <img src="${voucher.image_url}" alt="${voucher.title}" onclick="openVoucherModal('${voucherJson}')"/>
      <div class="voucher-card-content">
        <h3 onclick="openVoucherModal('${voucherJson}')">${voucher.title}</h3>
        <p>${voucher.description}</p>
        <div class="voucher-points">${voucher.points_required} Points</div>
        <div class="voucher-actions">
          <button class="btn btn-primary ${!canRedeem ? 'disabled' : ''}" 
                  onclick="redeemVoucher('${voucher.id}', ${voucher.points_required})"
                  ${!canRedeem ? 'disabled' : ''}>
            <i class="fas fa-gift"></i> ${canRedeem ? 'Redeem' : 'Not Enough Points'}
          </button>
          <button class="btn btn-secondary" onclick="addToCart('${voucher.id}')">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function loadHomeVouchers() {
  try {
    console.log("ð  Loading home vouchers...");
    
    const { data } = await db.auth.getSession();
    let userPoints = 0;
    
    if (data.session) {
      const { data: profile } = await db
        .from("profiles")
        .select("points")
        .eq("id", data.session.user.id)
        .single();
      
      userPoints = profile?.points || 0;
    }

    console.log("ð° User points:", userPoints);

    const { data: vouchers, error } = await db
      .from("vouchers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("ð¥ Database error:", error);
      displayVouchers(getSampleVouchers(), userPoints);
      return;
    }

    if (vouchers && vouchers.length > 0) {
      console.log(`â Loaded ${vouchers.length} vouchers from database for home page`);
      displayVouchers(vouchers, userPoints);
    } else {
      console.log("ð No vouchers in database, showing samples");
      displayVouchers(getSampleVouchers(), userPoints);
    }
    
  } catch (error) {
    console.error("Error loading home vouchers:", error);
    displayVouchers(getSampleVouchers(), userPoints);
  }
}

async function redeemVoucher(voucherId, pointsRequired) {
  try {
    if (voucherId.startsWith('sample-')) {
      showNotification("This is a sample voucher. Please add real vouchers to the database.", 'warning');
      return;
    }

    const { data } = await db.auth.getSession();
    if (!data.session) return;

    const user = data.session.user;

    const { data: profile } = await db
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (!profile) {
      showNotification("Profile not found", 'error');
      return;
    }

    const currentPoints = profile.points || 0;

    if (currentPoints < pointsRequired) {
      showNotification(`Not enough points! You need ${pointsRequired - currentPoints} more points.`, 'error');
      return;
    }

    const { data: existingRedemption } = await db
      .from("user_voucher_redemptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("voucher_id", voucherId)
      .single();

    if (existingRedemption) {
      showNotification("You have already redeemed this voucher!", 'error');
      return;
    }

    const newPoints = currentPoints - pointsRequired;
    
    const { error: pointsError } = await db
      .from("profiles")
      .update({ points: newPoints })
      .eq("id", user.id);

    if (pointsError) {
      showNotification("Error updating points", 'error');
      return;
    }

    const { error: redemptionError } = await db
      .from("user_voucher_redemptions")
      .insert([{
        user_id: user.id,
        voucher_id: voucherId,
        status: 'redeemed'
      }]);

    if (redemptionError) {
      await db.from("profiles").update({ points: currentPoints }).eq("id", user.id);
      showNotification("Error recording redemption", 'error');
      return;
    }

    await loadDashboard();
    if (window.location.pathname.includes('home.html')) {
      await loadHomeVouchers();
    } else if (window.location.pathname.includes('vouchers.html')) {
      await loadAllVouchers();
    }
    showNotification(`Voucher redeemed successfully! ${pointsRequired} points deducted.`, 'success');
    
  } catch (error) {
    console.error("Error redeeming voucher:", error);
    showNotification("Error redeeming voucher", 'error');
  }
}

function addToCart(voucherId) {
  if (voucherId.startsWith('sample-')) {
    showNotification("This is a sample voucher. Please add real vouchers to the database.", 'warning');
    return;
  }
  
  showNotification(`Voucher added to cart!`, 'success');
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (!cart.includes(voucherId)) {
    cart.push(voucherId);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
  updateCartCount();
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartCountEl = document.getElementById('cart-count');
  if (cartCountEl) {
    cartCountEl.textContent = cart.length;
    cartCountEl.style.display = cart.length > 0 ? 'flex' : 'none';
  }
}

function addToCartWithToast(voucherId) {
  if (voucherId.startsWith('sample-')) {
    showNotification("This is a sample voucher. Please add real vouchers to the database.", 'warning');
    return;
  }
  
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (!cart.includes(voucherId)) {
    cart.push(voucherId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    const toast = document.getElementById('cart-toast');
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }
  } else {
    showNotification("Voucher is already in your cart", 'info');
  }
}

function openVoucherModal(voucherData) {
  const modal = document.getElementById("voucher-modal");
  if (!modal) return;

  let voucher;
  
  if (typeof voucherData === 'string') {
    try {
      voucher = JSON.parse(voucherData.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
    } catch (e) {
      console.error("Error parsing voucher data:", e);
      return;
    }
  } else {
    voucher = voucherData;
  }

  document.getElementById("modal-title").textContent = voucher.title;
  document.getElementById("modal-img").src = voucher.image_url;
  document.getElementById("modal-desc").textContent = voucher.description;
  document.getElementById("modal-points").textContent = voucher.points_required;
  
  const termsEl = document.getElementById("modal-terms");
  if (termsEl && voucher.terms_conditions) {
    termsEl.textContent = voucher.terms_conditions;
  }
  
  const modalCategoryEl = document.getElementById("modal-category");
  if (modalCategoryEl && voucher.category) {
    modalCategoryEl.textContent = voucher.category.charAt(0).toUpperCase() + voucher.category.slice(1);
  }
  
  const validUntilEl = document.getElementById("modal-valid-until");
  if (validUntilEl && voucher.valid_until) {
    const validDate = new Date(voucher.valid_until).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    validUntilEl.textContent = validDate;
  }
  
  document.getElementById("modal-redeem-btn").onclick = () => {
    redeemVoucher(voucher.id, voucher.points_required);
    closeVoucherModal();
  };
  
  document.getElementById("modal-cart-btn").onclick = () => {
    if (window.location.pathname.includes('vouchers.html')) {
      addToCartWithToast(voucher.id);
    } else {
      addToCart(voucher.id);
    }
    closeVoucherModal();
  };

  modal.classList.add('show');
}

function closeVoucherModal() {
  const modal = document.getElementById("voucher-modal");
  if (modal) {
    modal.classList.remove('show');
  }
}

function searchVouchers() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;
  
  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    currentSearch = searchTerm;
    if (typeof applyFilters === 'function') {
      applyFilters();
    } else {
      filterDisplayedVouchers(searchTerm);
    }
  }
}

function filterDisplayedVouchers(searchTerm) {
  const voucherCards = document.querySelectorAll('.voucher-card');
  
  voucherCards.forEach(card => {
    const title = card.querySelector('h3').textContent.toLowerCase();
    const description = card.querySelector('p').textContent.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    if (title.includes(searchLower) || description.includes(searchLower) || searchTerm === '') {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

async function loadProfile() {
  try {
    const { data } = await db.auth.getSession();
    if (!data.session) {
      window.location.href = "signin.html";
      return;
    }

    const user = data.session.user;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("full_name, points, created_at")
      .eq("id", user.id)
      .single();

    if (!profileError && profile) {
      document.getElementById("profile-email").textContent = user.email;
      document.getElementById("profile-email-edit").textContent = user.email;
      document.getElementById("profile-name").textContent = profile.full_name || 'Not set';
      document.getElementById("edit-name").value = profile.full_name || '';
      
      const createdDate = new Date(profile.created_at).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      document.getElementById("profile-created").textContent = createdDate;

      const points = profile.points || 0;
      const tier = calculateTier(points);
      document.getElementById("profile-points").textContent = formatNumber(points);
      document.getElementById("profile-tier").textContent = tier;

      const { data: redemptions } = await db
        .from("user_voucher_redemptions")
        .select("id")
        .eq("user_id", user.id);
      
      document.getElementById("profile-redemptions").textContent = redemptions?.length || 0;
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

function toggleEditMode() {
  const viewMode = document.getElementById("view-mode");
  const editMode = document.getElementById("edit-mode");
  const editBtn = document.getElementById("edit-btn");

  if (viewMode.style.display === "none") {
    viewMode.style.display = "grid";
    editMode.style.display = "none";
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Profile';
  } else {
    viewMode.style.display = "none";
    editMode.style.display = "grid";
    editBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
  }
}

async function saveProfile() {
  try {
    const newName = document.getElementById("edit-name").value.trim();
    
    if (!newName) {
      showNotification("Name cannot be empty", 'error');
      return;
    }

    const { data } = await db.auth.getSession();
    if (!data.session) return;

    const { error } = await db
      .from("profiles")
      .update({ full_name: newName })
      .eq("id", data.session.user.id);

    if (error) {
      showNotification("Error updating profile", 'error');
      return;
    }

    document.getElementById("profile-name").textContent = newName;
    toggleEditMode();
    showNotification("Profile updated successfully!", 'success');

  } catch (error) {
    console.error("Error saving profile:", error);
    showNotification("Error updating profile", 'error');
  }
}

function cancelEdit() {
  toggleEditMode();
  loadProfile();
}

function togglePasswordChange() {
  const form = document.getElementById("password-change-form");
  form.style.display = form.style.display === "none" ? "grid" : "none";
}

async function changePassword() {
  try {
    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification("All password fields are required", 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification("New passwords do not match", 'error');
      return;
    }

    if (newPassword.length < 6) {
      showNotification("New password must be at least 6 characters", 'error');
      return;
    }

    const { error: updateError } = await db.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      showNotification("Error updating password: " + updateError.message, 'error');
      return;
    }

    document.getElementById("current-password").value = '';
    document.getElementById("new-password").value = '';
    document.getElementById("confirm-password").value = '';
    togglePasswordChange();

    showNotification("Password updated successfully!", 'success');

  } catch (error) {
    console.error("Error changing password:", error);
    showNotification("Error updating password", 'error');
  }
}

function cancelPasswordChange() {
  document.getElementById("current-password").value = '';
  document.getElementById("new-password").value = '';
  document.getElementById("confirm-password").value = '';
  togglePasswordChange();
}


let currentCategory = 'all';
let currentSort = 'newest';
let currentSearch = '';
let currentViewMode = 'grid';
let currentPage = 1;
let vouchersPerPage = 12;
let allVouchers = [];
let filteredVouchers = [];

async function loadVouchersPage() {
  try {
    console.log("ð« Starting vouchers page load...");
    
    const { data } = await db.auth.getSession();
    if (!data.session) {
      console.log("ð« No session found, redirecting to signin");
      window.location.href = "signin.html";
      return;
    }
    
    console.log("â User authenticated:", data.session.user.email);
    
    await loadUserPointsHeader();
    
    updateCartCount();
    
    await loadAllVouchers();
    
    console.log("ð Vouchers page loaded successfully");
    
  } catch (error) {
    console.error("ð¥ Error loading vouchers page:", error);
    showNotification("Error loading page", 'error');
  }
}

async function loadUserPointsHeader() {
  try {
    const { data } = await db.auth.getSession();
    if (!data.session) return;

    const { data: profile } = await db
      .from("profiles")
      .select("points")
      .eq("id", data.session.user.id)
      .single();

    const points = profile?.points || 0;
    const headerPoints = document.getElementById("user-points-header");
    if (headerPoints) {
      headerPoints.textContent = formatNumber(points);
    }
  } catch (error) {
    console.error("Error loading user points:", error);
  }
}

async function getCurrentUserPoints() {
  try {
    const { data } = await db.auth.getSession();
    if (!data.session) return 0;

    const { data: profile } = await db
      .from("profiles")
      .select("points")
      .eq("id", data.session.user.id)
      .single();

    return profile?.points || 0;
  } catch (error) {
    console.error("Error getting user points:", error);
    return 0;
  }
}

async function loadAllVouchers() {
  try {
    console.log("ð Loading all vouchers from database...");
    showLoadingSpinner();

    const { data: sessionData } = await db.auth.getSession();
    let userPoints = 0;
    
    if (sessionData.session) {
      const { data: profile } = await db
        .from("profiles")
        .select("points")
        .eq("id", sessionData.session.user.id)
        .single();
      
      userPoints = profile?.points || 0;
      console.log("User points:", userPoints);
    }

    const { data: vouchers, error: vouchersError } = await db
      .from("vouchers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (vouchersError) {
      console.error("Error fetching vouchers:", vouchersError);
      
      if (vouchersError.message.includes("Could not find the table")) {
        showTableNotFoundError();
        return;
      } else {
        showDatabaseError(vouchersError.message);
        return;
      }
    }

    console.log(`Query returned ${vouchers ? vouchers.length : 0} vouchers`);

    if (vouchers && vouchers.length > 0) {
      console.log("Successfully loaded vouchers:", vouchers);
      allVouchers = vouchers;
      filteredVouchers = [...allVouchers];
      displayFilteredVouchers(userPoints);
      updateResultsCount();
      showNotification(`Loaded ${vouchers.length} vouchers successfully!`, 'success');
    } else {
      console.log("No vouchers found in database");
      showEmptyState();
    }
    
  } catch (error) {
    console.error("Unexpected error loading vouchers:", error);
    showDatabaseError(error.message);
  }
}

function showLoadingSpinner() {
  const container = document.getElementById("voucher-list");
  if (container) {
    container.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading vouchers...</p>
      </div>
    `;
  }
}

function showTableNotFoundError() {
  const container = document.getElementById("voucher-list");
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-database" style="font-size: 4rem; color: #ef4444; margin-bottom: 1.5rem;"></i>
        <h3 style="color: #ef4444; margin-bottom: 1rem;">Database Table Not Found</h3>
        <p style="color: #64748b; margin-bottom: 1rem;">The vouchers table doesn't exist in your Supabase database</p>
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin: 1rem 0; color: #92400e; font-size: 0.9rem;">
          <p><strong>To fix this:</strong></p>
          <ol style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Go to your Supabase SQL Editor</li>
            <li>Run the table creation SQL provided in the setup guide</li>
            <li>Insert sample data</li>
            <li>Refresh this page</li>
          </ol>
        </div>
        <button class="btn btn-primary" onclick="loadAllVouchers()" style="margin-right: 1rem;">
          <i class="fas fa-refresh"></i> Retry
        </button>
        <button class="btn btn-secondary" onclick="loadSampleVouchers()">
          <i class="fas fa-eye"></i> Show Sample Data
        </button>
      </div>
    `;
  }
  showNotification("Vouchers table not found - please create the database table", 'error');
}

function showDatabaseError(errorMessage) {
  const container = document.getElementById("voucher-list");
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ef4444; margin-bottom: 1.5rem;"></i>
        <h3 style="color: #ef4444; margin-bottom: 1rem;">Database Error</h3>
        <p style="color: #64748b; margin-bottom: 1rem;">Unable to load vouchers from database</p>
        <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin: 1rem 0; color: #dc2626; font-family: monospace; font-size: 0.9rem;">
          ${errorMessage}
        </div>
        <button class="btn btn-primary" onclick="loadAllVouchers()" style="margin-right: 1rem;">
          <i class="fas fa-refresh"></i> Retry
        </button>
        <button class="btn btn-secondary" onclick="loadSampleVouchers()">
          <i class="fas fa-eye"></i> Show Sample Data
        </button>
      </div>
    `;
  }
  showNotification("Database error - check console for details", 'error');
}

function showEmptyState() {
  const container = document.getElementById("voucher-list");
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-gift" style="font-size: 4rem; color: #64748b; margin-bottom: 1.5rem; opacity: 0.7;"></i>
        <h3 style="color: #64748b; margin-bottom: 1rem;">No Vouchers Available</h3>
        <p style="color: #94a3b8; margin-bottom: 1.5rem;">There are currently no active vouchers in the database</p>
        <button class="btn btn-secondary" onclick="loadSampleVouchers()">
          <i class="fas fa-eye"></i> View Sample Vouchers
        </button>
      </div>
    `;
  }
  updateResultsCount();
}

function loadSampleVouchers() {
  console.log("Loading sample vouchers...");
  allVouchers = getSampleVouchersExtended();
  filteredVouchers = [...allVouchers];
  
  getCurrentUserPoints().then(userPoints => {
    displayFilteredVouchers(userPoints);
    updateResultsCount();
    showNotification("Showing sample vouchers", 'info');
  });
}

function displayFilteredVouchers(userPoints) {
  const container = document.getElementById("voucher-list");
  if (!container) return;

  container.innerHTML = "";
  container.className = currentViewMode === 'grid' ? 'vouchers-grid' : 'vouchers-list';

  if (filteredVouchers.length === 0) {
    container.innerHTML = `
      <div class="empty-vouchers">
        <i class="fas fa-search"></i>
        <h3>No vouchers found</h3>
        <p>Try adjusting your search criteria or browse different categories</p>
        <button class="btn btn-primary" onclick="clearFilters()">
          <i class="fas fa-refresh"></i> Clear Filters
        </button>
      </div>
    `;
    return;
  }

  const vouchersToShow = filteredVouchers.slice(0, currentPage * vouchersPerPage);
  
  vouchersToShow.forEach(voucher => {
    const canRedeem = userPoints >= voucher.points_required;
    const card = document.createElement("div");
    card.className = currentViewMode === 'grid' ? 'voucher-card' : 'voucher-card list-view';
    
    const voucherJson = JSON.stringify(voucher).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    if (currentViewMode === 'grid') {
      card.innerHTML = `
        <img src="${voucher.image_url}" alt="${voucher.title}" onclick="openVoucherModal('${voucherJson}')"/>
        <div class="voucher-card-content">
          <h3 onclick="openVoucherModal('${voucherJson}')">${voucher.title}</h3>
          <p>${voucher.description}</p>
          <div class="voucher-points">${voucher.points_required} Points</div>
          <div class="voucher-actions">
            <button class="btn btn-primary ${!canRedeem ? 'disabled' : ''}" 
                    onclick="redeemVoucher('${voucher.id}', ${voucher.points_required})"
                    ${!canRedeem ? 'disabled' : ''}>
              <i class="fas fa-gift"></i> ${canRedeem ? 'Redeem' : 'Not Enough Points'}
            </button>
            <button class="btn btn-secondary" onclick="addToCartWithToast('${voucher.id}')">
              <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
          </div>
        </div>
      `;
    } else {
      card.innerHTML = `
        <img src="${voucher.image_url}" alt="${voucher.title}" onclick="openVoucherModal('${voucherJson}')"/>
        <div class="voucher-card-content">
          <div class="voucher-info">
            <h3 onclick="openVoucherModal('${voucherJson}')">${voucher.title}</h3>
            <p>${voucher.description}</p>
            <div class="voucher-points">${voucher.points_required} Points</div>
          </div>
          <div class="voucher-actions">
            <button class="btn btn-primary ${!canRedeem ? 'disabled' : ''}" 
                    onclick="redeemVoucher('${voucher.id}', ${voucher.points_required})"
                    ${!canRedeem ? 'disabled' : ''}>
              <i class="fas fa-gift"></i> ${canRedeem ? 'Redeem' : 'Not Enough Points'}
            </button>
            <button class="btn btn-secondary" onclick="addToCartWithToast('${voucher.id}')">
              <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
          </div>
        </div>
      `;
    }
    
    container.appendChild(card);
  });

  const loadMoreContainer = document.getElementById("load-more-container");
  if (loadMoreContainer) {
    if (vouchersToShow.length < filteredVouchers.length) {
      loadMoreContainer.style.display = "block";
    } else {
      loadMoreContainer.style.display = "none";
    }
  }
}

function filterByCategory(category) {
  currentCategory = category;
  currentPage = 1;
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-category="${category}"]`).classList.add('active');
  
  applyFilters();
}

function sortVouchers() {
  const sortSelect = document.getElementById('sort-select');
  currentSort = sortSelect.value;
  currentPage = 1;
  applyFilters();
}

function setViewMode(mode) {
  currentViewMode = mode;
  
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-view="${mode}"]`).classList.add('active');
  
  getCurrentUserPoints().then(userPoints => {
    displayFilteredVouchers(userPoints);
  });
}

async function applyFilters() {
  const userPoints = await getCurrentUserPoints();
  
  if (currentCategory === 'all') {
    filteredVouchers = [...allVouchers];
  } else {
    filteredVouchers = allVouchers.filter(v => v.category === currentCategory);
  }
  
  if (currentSearch) {
    filteredVouchers = filteredVouchers.filter(v => 
      v.title.toLowerCase().includes(currentSearch.toLowerCase()) ||
      v.description.toLowerCase().includes(currentSearch.toLowerCase())
    );
  }
  
  sortVouchersArray();
  displayFilteredVouchers(userPoints);
  updateResultsCount();
}

function sortVouchersArray() {
  switch (currentSort) {
    case 'newest':
      filteredVouchers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case 'oldest':
      filteredVouchers.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'points-low':
      filteredVouchers.sort((a, b) => a.points_required - b.points_required);
      break;
    case 'points-high':
      filteredVouchers.sort((a, b) => b.points_required - a.points_required);
      break;
    case 'name-az':
      filteredVouchers.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'name-za':
      filteredVouchers.sort((a, b) => b.title.localeCompare(a.title));
      break;
  }
}

function updateResultsCount() {
  const resultsCountEl = document.getElementById("results-count");
  if (resultsCountEl) {
    const total = filteredVouchers.length;
    const showing = Math.min(currentPage * vouchersPerPage, total);
    resultsCountEl.textContent = `Showing ${showing} of ${total} vouchers`;
  }
}

function loadMoreVouchers() {
  currentPage++;
  getCurrentUserPoints().then(userPoints => {
    displayFilteredVouchers(userPoints);
    updateResultsCount();
  });
}

function clearFilters() {
  currentCategory = 'all';
  currentSort = 'newest';
  currentSearch = '';
  currentPage = 1;
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector('[data-category="all"]').classList.add('active');
  
  document.getElementById('sort-select').value = 'newest';
  
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  
  applyFilters();
}

async function loadCartPage() {
  try {
    console.log("ð Starting cart page load...");
    
    const { data } = await db.auth.getSession();
    if (!data.session) {
      console.log("« No session found, redirecting to signin");
      window.location.href = "signin.html";
      return;
    }
    
    console.log("User authenticated:", data.session.user.email);
    
    await loadUserPointsHeader();
    
    await loadCartItems();
    
    console.log("Cart page loaded successfully");
    
  } catch (error) {
    console.error("Error loading cart page:", error);
    showNotification("Error loading cart", 'error');
  }
}

async function loadCartItems() {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartItemsContainer = document.getElementById('cart-items');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    
    if (cart.length === 0) {
      showEmptyCart();
      updateCartSummary([], 0);
      return;
    }
    
    if (clearCartBtn) {
      clearCartBtn.style.display = 'block';
    }
    
    const userPoints = await getCurrentUserPoints();
    
    const cartVouchers = [];
    
    if (cart.some(id => !id.startsWith('sample-'))) {
      const { data: dbVouchers } = await db
        .from("vouchers")
        .select("*")
        .in("id", cart.filter(id => !id.startsWith('sample-')));
      
      if (dbVouchers) {
        cartVouchers.push(...dbVouchers);
      }
    }
    
    const sampleVouchers = getSampleVouchersExtended();
    const sampleIds = cart.filter(id => id.startsWith('sample-'));
    sampleIds.forEach(id => {
      const sampleVoucher = sampleVouchers.find(v => v.id === id);
      if (sampleVoucher) {
        cartVouchers.push(sampleVoucher);
      }
    });
    
    displayCartItems(cartVouchers, userPoints);
    updateCartSummary(cartVouchers, userPoints);
    
  } catch (error) {
    console.error("Error loading cart items:", error);
    showNotification("Error loading cart items", 'error');
  }
}

function displayCartItems(vouchers, userPoints) {
  const container = document.getElementById('cart-items');
  if (!container) return;
  
  if (vouchers.length === 0) {
    showEmptyCart();
    return;
  }
  
  container.innerHTML = '';
  
  vouchers.forEach(voucher => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <img src="${voucher.image_url}" alt="${voucher.title}" class="cart-item-image">
      <div class="cart-item-info">
        <h3 class="cart-item-title">${voucher.title}</h3>
        <p class="cart-item-description">${voucher.description}</p>
        <span class="cart-item-category">
          <i class="fas fa-tag"></i>
          ${voucher.category ? voucher.category.charAt(0).toUpperCase() + voucher.category.slice(1) : 'General'}
        </span>
      </div>
      <div class="cart-item-points">
        <div class="cart-item-points-badge">
          <i class="fas fa-coins"></i>
          ${voucher.points_required}
        </div>
      </div>
      <div class="cart-item-actions">
        <button class="btn btn-primary btn-sm" onclick="redeemSingleItem('${voucher.id}', ${voucher.points_required})">
          <i class="fas fa-gift"></i> Redeem
        </button>
        <button class="btn btn-danger btn-sm" onclick="removeFromCart('${voucher.id}')">
          <i class="fas fa-trash"></i> Remove
        </button>
      </div>
    `;
    container.appendChild(cartItem);
  });
}

function showEmptyCart() {
  const container = document.getElementById('cart-items');
  if (container) {
    container.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <h3>Your cart is empty</h3>
        <p>Browse vouchers and add them to your cart to get started</p>
        <button class="btn btn-primary" onclick="location.href='vouchers.html'">
          <i class="fas fa-gift"></i> Browse Vouchers
        </button>
      </div>
    `;
  }
}

function updateCartSummary(vouchers, userPoints) {
  const totalItems = vouchers.length;
  const totalPoints = vouchers.reduce((sum, v) => sum + v.points_required, 0);
  const remainingPoints = userPoints - totalPoints;
  
  document.getElementById('total-items').textContent = totalItems;
  document.getElementById('total-points').textContent = formatNumber(totalPoints);
  document.getElementById('current-points').textContent = formatNumber(userPoints);
  document.getElementById('remaining-points').textContent = formatNumber(remainingPoints);
  
  const balanceEl = document.getElementById('points-balance');
  const redeemBtn = document.getElementById('redeem-all-btn');
  const insufficientNotice = document.getElementById('insufficient-points-notice');
  
  if (remainingPoints >= 0) {
    balanceEl.classList.remove('insufficient');
    balanceEl.classList.add('sufficient');
    redeemBtn.disabled = false;
    insufficientNotice.style.display = 'none';
  } else {
    balanceEl.classList.remove('sufficient');
    balanceEl.classList.add('insufficient');
    redeemBtn.disabled = true;
    insufficientNotice.style.display = 'flex';
  }
}

function removeFromCart(voucherId) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  cart = cart.filter(id => id !== voucherId);
  localStorage.setItem('cart', JSON.stringify(cart));
  
  updateCartCount();
  loadCartItems();
  showNotification("Item removed from cart", 'info');
}

function clearCart() {
  if (confirm("Are you sure you want to clear your cart?")) {
    localStorage.setItem('cart', '[]');
    updateCartCount();
    loadCartItems();
    showNotification("Cart cleared", 'info');
  }
}

async function redeemSingleItem(voucherId, pointsRequired) {
  await redeemVoucher(voucherId, pointsRequired);
  removeFromCart(voucherId);
}

function redeemAllItems() {
  const modal = document.getElementById('redeem-modal');
  if (modal) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    document.getElementById('modal-items-count').textContent = cart.length;
    
    modal.classList.add('show');
  }
}

function closeRedeemModal() {
  const modal = document.getElementById('redeem-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

async function confirmRedeemAll() {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    for (const voucherId of cart) {
      let voucher = null;
      
      if (voucherId.startsWith('sample-')) {
        const sampleVouchers = getSampleVouchersExtended();
        voucher = sampleVouchers.find(v => v.id === voucherId);
      } else {
        const { data: dbVoucher } = await db
          .from("vouchers")
          .select("*")
          .eq("id", voucherId)
          .single();
        voucher = dbVoucher;
      }
      
      if (voucher) {
        await redeemVoucher(voucherId, voucher.points_required);
      }
    }
    
    localStorage.setItem('cart', '[]');
    updateCartCount();
    loadCartItems();
    closeRedeemModal();
    
    showNotification("All items redeemed successfully!", 'success');
    
  } catch (error) {
    console.error("Error redeeming all items:", error);
    showNotification("Error redeeming some items", 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  updateCartCount();
  
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchVouchers();
      }
    });
  }
});

document.addEventListener('click', function(event) {
  const modals = document.querySelectorAll('.modal.show');
  modals.forEach(modal => {
    if (event.target === modal) {
      modal.classList.remove('show');
    }
  });
});

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modal => {
      modal.classList.remove('show');
    });
  }
});

initializeTheme();

console.log("Optima Bank App initialized with theme support!");

// ==================== CART QUANTITY MANAGEMENT ====================

function getCartWithQuantities() {
  return JSON.parse(localStorage.getItem('cartWithQuantities') || '{}');
}

function setCartWithQuantities(cart) {
  localStorage.setItem('cartWithQuantities', JSON.stringify(cart));
  updateCartCount();
}

function addToCartWithQuantity(voucherId, quantity = 1) {
  if (voucherId.startsWith('sample-')) {
    showNotification("This is a sample voucher. Please add real vouchers to the database.", 'warning');
    return;
  }
  
  const cart = getCartWithQuantities();
  
  if (cart[voucherId]) {
    cart[voucherId] = Math.min(cart[voucherId] + quantity, 10); // Max 10 per item
    showNotification(`Updated quantity to ${cart[voucherId]}`, 'info');
  } else {
    cart[voucherId] = Math.min(quantity, 10);
    showNotification(`Added ${cart[voucherId]} voucher(s) to cart!`, 'success');
  }
  
  setCartWithQuantities(cart);
  
  if (window.location.pathname.includes('vouchers.html')) {
    const toast = document.getElementById('cart-toast');
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }
  }
}

function updateCartCount() {
  const cart = getCartWithQuantities();
  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartCountEl = document.getElementById('cart-count');
  if (cartCountEl) {
    cartCountEl.textContent = totalItems;
    cartCountEl.style.display = totalItems > 0 ? 'flex' : 'none';
  }
}

function addToCart(voucherId) {
  addToCartWithQuantity(voucherId, 1);
}

function addToCartWithToast(voucherId) {
  addToCartWithQuantity(voucherId, 1);
}

// ==================== CART PAGE FUNCTIONS ====================

async function loadCartItems() {
  try {
    const cart = getCartWithQuantities();
    const cartItemsContainer = document.getElementById('cart-items');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    
    if (Object.keys(cart).length === 0) {
      showEmptyCart();
      updateCartSummary([], 0);
      return;
    }
    
    if (clearCartBtn) {
      clearCartBtn.style.display = 'block';
    }
    
    const userPoints = await getCurrentUserPoints();
    
    const cartVouchers = [];
    const voucherIds = Object.keys(cart);
    
    const dbIds = voucherIds.filter(id => !id.startsWith('sample-'));
    if (dbIds.length > 0) {
      const { data: dbVouchers } = await db
        .from("vouchers")
        .select("*")
        .in("id", dbIds);
      
      if (dbVouchers) {
        dbVouchers.forEach(voucher => {
          cartVouchers.push({
            ...voucher,
            quantity: cart[voucher.id]
          });
        });
      }
    }
    
    const sampleVouchers = getSampleVouchersExtended();
    const sampleIds = voucherIds.filter(id => id.startsWith('sample-'));
    sampleIds.forEach(id => {
      const sampleVoucher = sampleVouchers.find(v => v.id === id);
      if (sampleVoucher) {
        cartVouchers.push({
          ...sampleVoucher,
          quantity: cart[id]
        });
      }
    });
    
    displayCartItems(cartVouchers, userPoints);
    updateCartSummary(cartVouchers, userPoints);
    
  } catch (error) {
    console.error("Error loading cart items:", error);
    showNotification("Error loading cart items", 'error');
  }
}

function displayCartItems(vouchers, userPoints) {
  const container = document.getElementById('cart-items');
  if (!container) return;
  
  if (vouchers.length === 0) {
    showEmptyCart();
    return;
  }
  
  container.innerHTML = '';
  
  vouchers.forEach(voucher => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <img src="${voucher.image_url}" alt="${voucher.title}" class="cart-item-image">
      <div class="cart-item-info">
        <h3 class="cart-item-title">${voucher.title}</h3>
        <p class="cart-item-description">${voucher.description}</p>
        <span class="cart-item-category">
          <i class="fas fa-tag"></i>
          ${voucher.category ? voucher.category.charAt(0).toUpperCase() + voucher.category.slice(1) : 'General'}
        </span>
      </div>
      <div class="cart-item-points">
        <div class="cart-item-points-badge">
          <i class="fas fa-coins"></i>
          ${voucher.points_required} each
        </div>
      </div>
      <div class="cart-item-quantity">
        <div class="cart-item-quantity-display">
          <span class="cart-item-quantity-label">Qty</span>
          <span class="cart-item-quantity-value">${voucher.quantity}</span>
        </div>
        <button class="edit-quantity-btn" onclick="editQuantity('${voucher.id}')">
          <i class="fas fa-edit"></i> Edit
        </button>
      </div>
      <div class="cart-item-actions">
        <button class="btn btn-primary btn-sm" onclick="redeemSingleItem('${voucher.id}', ${voucher.points_required}, ${voucher.quantity})">
          <i class="fas fa-gift"></i> Redeem
        </button>
        <button class="btn btn-danger btn-sm" onclick="removeFromCart('${voucher.id}')">
          <i class="fas fa-trash"></i> Remove
        </button>
      </div>
    `;
    container.appendChild(cartItem);
  });
}

function updateCartSummary(vouchers, userPoints) {
  const totalUniqueItems = vouchers.length;
  const totalVouchers = vouchers.reduce((sum, v) => sum + v.quantity, 0);
  const totalPoints = vouchers.reduce((sum, v) => sum + (v.points_required * v.quantity), 0);
  const remainingPoints = userPoints - totalPoints;
  
  document.getElementById('total-items').textContent = totalUniqueItems;
  document.getElementById('total-vouchers').textContent = totalVouchers;
  document.getElementById('total-points').textContent = formatNumber(totalPoints);
  document.getElementById('current-points').textContent = formatNumber(userPoints);
  document.getElementById('remaining-points').textContent = formatNumber(remainingPoints);
  
  const balanceEl = document.getElementById('points-balance');
  const redeemBtn = document.getElementById('redeem-all-btn');
  const insufficientNotice = document.getElementById('insufficient-points-notice');
  
  if (remainingPoints >= 0 && totalVouchers > 0) {
    balanceEl.classList.remove('insufficient');
    balanceEl.classList.add('sufficient');
    redeemBtn.disabled = false;
    insufficientNotice.style.display = 'none';
  } else {
    balanceEl.classList.remove('sufficient');
    balanceEl.classList.add('insufficient');
    redeemBtn.disabled = true;
    if (totalVouchers > 0) {
      insufficientNotice.style.display = 'flex';
    }
  }
}

function removeFromCart(voucherId) {
  const cart = getCartWithQuantities();
  delete cart[voucherId];
  setCartWithQuantities(cart);
  
  loadCartItems();
  showNotification("Item removed from cart", 'info');
}

function clearCart() {
  if (confirm("Are you sure you want to clear your cart?")) {
    setCartWithQuantities({});
    loadCartItems();
    showNotification("Cart cleared", 'info');
  }
}

// ==================== QUANTITY MODAL ====================

let currentEditingVoucherId = null;

async function editQuantity(voucherId) {
  currentEditingVoucherId = voucherId;
  const cart = getCartWithQuantities();
  const currentQuantity = cart[voucherId] || 1;
  
  let voucher = null;
  
  if (voucherId.startsWith('sample-')) {
    const sampleVouchers = getSampleVouchersExtended();
    voucher = sampleVouchers.find(v => v.id === voucherId);
  } else {
    const { data: dbVoucher } = await db
      .from("vouchers")
      .select("*")
      .eq("id", voucherId)
      .single();
    voucher = dbVoucher;
  }
  
  if (!voucher) {
    showNotification("Voucher not found", 'error');
    return;
  }
  
  document.getElementById('quantity-modal-img').src = voucher.image_url;
  document.getElementById('quantity-modal-title').textContent = voucher.title;
  document.getElementById('quantity-modal-desc').textContent = voucher.description;
  document.getElementById('quantity-modal-points').textContent = voucher.points_required;
  document.getElementById('quantity-input').value = currentQuantity;
  
  updateQuantityDisplay();
  
  document.getElementById('quantity-modal').classList.add('show');
}

function closeQuantityModal() {
  document.getElementById('quantity-modal').classList.remove('show');
  currentEditingVoucherId = null;
}

function increaseQuantity() {
  const input = document.getElementById('quantity-input');
  const currentValue = parseInt(input.value) || 1;
  const newValue = Math.min(currentValue + 1, 10);
  input.value = newValue;
  updateQuantityDisplay();
}

function decreaseQuantity() {
  const input = document.getElementById('quantity-input');
  const currentValue = parseInt(input.value) || 1;
  const newValue = Math.max(currentValue - 1, 1);
  input.value = newValue;
  updateQuantityDisplay();
}

function validateQuantity() {
  const input = document.getElementById('quantity-input');
  let value = parseInt(input.value) || 1;
  value = Math.max(1, Math.min(value, 10));
  input.value = value;
  updateQuantityDisplay();
}

function updateQuantityDisplay() {
  const quantity = parseInt(document.getElementById('quantity-input').value) || 1;
  const pointsPerVoucher = parseInt(document.getElementById('quantity-modal-points').textContent) || 0;
  const totalPoints = quantity * pointsPerVoucher;
  
  document.getElementById('quantity-display').textContent = quantity;
  document.getElementById('points-per-voucher').textContent = pointsPerVoucher;
  document.getElementById('total-points-for-item').textContent = totalPoints;
}

function updateQuantity() {
  if (!currentEditingVoucherId) return;
  
  const newQuantity = parseInt(document.getElementById('quantity-input').value) || 1;
  const cart = getCartWithQuantities();
  
  cart[currentEditingVoucherId] = newQuantity;
  setCartWithQuantities(cart);
  
  closeQuantityModal();
  loadCartItems();
  showNotification(`Quantity updated to ${newQuantity}`, 'success');
}

// ==================== REDEMPTION WITH QUANTITY ====================

async function redeemSingleItem(voucherId, pointsRequired, quantity) {
  try {
    if (voucherId.startsWith('sample-')) {
      showNotification("This is a sample voucher. Please add real vouchers to the database.", 'warning');
      return;
    }

    const { data } = await db.auth.getSession();
    if (!data.session) return;

    const user = data.session.user;
    const totalPointsRequired = pointsRequired * quantity;

    const { data: profile } = await db
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (!profile) {
      showNotification("Profile not found", 'error');
      return;
    }

    const currentPoints = profile.points || 0;

    if (currentPoints < totalPointsRequired) {
      showNotification(`Not enough points! You need ${totalPointsRequired - currentPoints} more points.`, 'error');
      return;
    }

    const newPoints = currentPoints - totalPointsRequired;
    
    const { error: pointsError } = await db
      .from("profiles")
      .update({ points: newPoints })
      .eq("id", user.id);

    if (pointsError) {
      showNotification("Error updating points", 'error');
      return;
    }

    const redemptions = [];
    for (let i = 0; i < quantity; i++) {
      redemptions.push({
        user_id: user.id,
        voucher_id: voucherId,
        status: 'redeemed',
        redeemed_at: new Date().toISOString()
      });
    }

    const { error: redemptionError } = await db
      .from("user_voucher_redemptions")
      .insert(redemptions);

    if (redemptionError) {
      await db.from("profiles").update({ points: currentPoints }).eq("id", user.id);
      showNotification("Error recording redemption", 'error');
      return;
    }

    removeFromCart(voucherId);
    
    await loadDashboard();
    showNotification(`${quantity} voucher(s) redeemed successfully! ${totalPointsRequired} points deducted.`, 'success');
    
    generateVoucherPDFs([{ id: voucherId, quantity: quantity }]);
    
  } catch (error) {
    console.error("Error redeeming voucher:", error);
    showNotification("Error redeeming voucher", 'error');
  }
}

function redeemAllItems() {
  const cart = getCartWithQuantities();
  const totalUniqueItems = Object.keys(cart).length;
  const totalVouchers = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  
  if (totalUniqueItems === 0) {
    showNotification("Your cart is empty", 'info');
    return;
  }
  
  document.getElementById('modal-items-count').textContent = totalUniqueItems;
  document.getElementById('modal-vouchers-count').textContent = totalVouchers;
  
  loadCartItems().then(() => {
    document.getElementById('redeem-modal').classList.add('show');
  });
}

function closeRedeemModal() {
  document.getElementById('redeem-modal').classList.remove('show');
}

async function confirmRedeemAll() {
  try {
    const cart = getCartWithQuantities();
    const redemptionList = [];
    
    for (const [voucherId, quantity] of Object.entries(cart)) {
      if (voucherId.startsWith('sample-')) {
        showNotification("Sample vouchers cannot be redeemed", 'warning');
        continue;
      }
      
      const { data: voucher } = await db
        .from("vouchers")
        .select("*")
        .eq("id", voucherId)
        .single();
      
      if (voucher) {
        const { data } = await db.auth.getSession();
        const user = data.session.user;
        const totalPointsRequired = voucher.points_required * quantity;

        const { data: profile } = await db
          .from("profiles")
          .select("points")
          .eq("id", user.id)
          .single();

        const currentPoints = profile.points || 0;

        if (currentPoints < totalPointsRequired) {
          showNotification(`Not enough points for ${voucher.title}`, 'error');
          continue;
        }

        const newPoints = currentPoints - totalPointsRequired;
        await db.from("profiles").update({ points: newPoints }).eq("id", user.id);

        const redemptions = [];
        for (let i = 0; i < quantity; i++) {
          redemptions.push({
            user_id: user.id,
            voucher_id: voucherId,
            status: 'redeemed',
            redeemed_at: new Date().toISOString()
          });
        }

        await db.from("user_voucher_redemptions").insert(redemptions);
        
        redemptionList.push({ id: voucherId, quantity, title: voucher.title });
      }
    }
    
    setCartWithQuantities({});
    loadCartItems();
    closeRedeemModal();
    
    await loadDashboard();
    await loadUserPointsHeader();
    
    showNotification("All items redeemed successfully!", 'success');
    
    if (redemptionList.length > 0) {
      generateVoucherPDFs(redemptionList);
    }
    
  } catch (error) {
    console.error("Error redeeming all items:", error);
    showNotification("Error redeeming some items", 'error');
  }
}

// ==================== PDF GENERATION ====================

function generateVoucherPDFs(redemptionList) {
  const downloadList = [];
  
  redemptionList.forEach(item => {
    for (let i = 1; i <= item.quantity; i++) {
      const fileName = `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}_${i}.pdf`;
      const blob = generateVoucherPDF(item, i);
      const url = URL.createObjectURL(blob);
      
      downloadList.push({
        title: item.title,
        fileName: fileName,
        url: url,
        voucherNumber: i,
        totalQuantity: item.quantity
      });
    }
  });
  
  showDownloadModal(downloadList);
}

function generateVoucherPDF(voucherItem, voucherNumber) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175); // Optima blue
  doc.text('OPTIMA BANK', 20, 30);
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('VOUCHER CERTIFICATE', 20, 45);
  
  doc.setFontSize(14);
  doc.text(`Voucher: ${voucherItem.title}`, 20, 70);
  doc.text(`Voucher #: ${voucherNumber} of ${voucherItem.totalQuantity}`, 20, 85);
  doc.text(`Redeemed on: ${new Date().toLocaleDateString()}`, 20, 100);
  doc.text(`Valid until: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 20, 115);
  
  const voucherCode = `OPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  doc.setFontSize(12);
  doc.text(`Voucher Code: ${voucherCode}`, 20, 140);
  
  doc.rect(20, 160, 40, 40);
  doc.text('QR Code', 25, 185);
  
  doc.setFontSize(10);
  doc.text('Terms & Conditions:', 20, 220);
  doc.text('â¢ This voucher is non-transferable and non-refundable', 20, 235);
  doc.text('â¢ Present this voucher at participating merchants', 20, 245);
  doc.text('â¢ Valid for one-time use only', 20, 255);
  doc.text('â¢ Contact Optima Bank customer service for assistance', 20, 265);
  
  doc.setTextColor(100, 100, 100);
  doc.text('Generated by Optima Bank Rewards System', 20, 280);
  
  return doc.output('blob');
}

function showDownloadModal(downloadList) {
  const modal = document.getElementById('download-modal');
  const downloadListContainer = document.getElementById('download-list');
  
  downloadListContainer.innerHTML = '';
  
  downloadList.forEach(item => {
    const downloadItem = document.createElement('div');
    downloadItem.className = 'download-item';
    downloadItem.innerHTML = `
      <div class="download-item-info">
        <div class="download-item-icon">
          <i class="fas fa-file-pdf"></i>
        </div>
        <div class="download-item-details">
          <h5>${item.title}</h5>
          <p>Voucher ${item.voucherNumber} of ${item.totalQuantity} â¢ PDF Document</p>
        </div>
      </div>
      <div class="download-item-quantity">
        PDF
      </div>
      <button class="btn btn-primary btn-sm" onclick="downloadSinglePDF('${item.url}', '${item.fileName}')">
        <i class="fas fa-download"></i> Download
      </button>
    `;
    downloadListContainer.appendChild(downloadItem);
  });
  
  window.currentDownloadList = downloadList;
  
  modal.classList.add('show');
}

function closeDownloadModal() {
  document.getElementById('download-modal').classList.remove('show');
  
  if (window.currentDownloadList) {
    window.currentDownloadList.forEach(item => {
      URL.revokeObjectURL(item.url);
    });
    window.currentDownloadList = null;
  }
}

function downloadSinglePDF(url, fileName) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadAllPDFs() {
  if (window.currentDownloadList) {
    window.currentDownloadList.forEach(item => {
      setTimeout(() => {
        downloadSinglePDF(item.url, item.fileName);
      }, 100); // Small delay between downloads
    });
    showNotification(`Downloading ${window.currentDownloadList.length} PDF files`, 'success');
  }
}

// ==================== UPDATE EXISTING FUNCTIONS ====================

function displayVouchers(vouchers, userPoints) {
  const container = document.getElementById("voucher-list");
  if (!container) return;

  container.innerHTML = "";

  if (!vouchers || vouchers.length === 0) {
    container.innerHTML = `
      <div class="no-vouchers">
        <i class="fas fa-gift" style="font-size: 4rem; color: #64748b; margin-bottom: 1.5rem; opacity: 0.7;"></i>
        <p style="color: #94a3b8; font-size: 1.2rem; font-weight: 500; margin-bottom: 0.5rem;">No vouchers available at the moment</p>
        <p style="color: #64748b; font-size: 1rem; opacity: 0.8;">Check back later for new rewards!</p>
      </div>
    `;
    return;
  }

  vouchers.forEach(voucher => {
    const canRedeem = userPoints >= voucher.points_required;
    const card = document.createElement("div");
    card.className = "voucher-card";
    
    const voucherJson = JSON.stringify(voucher).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    card.innerHTML = `
      <img src="${voucher.image_url}" alt="${voucher.title}" onclick="openVoucherModal('${voucherJson}')"/>
      <div class="voucher-card-content">
        <h3 onclick="openVoucherModal('${voucherJson}')">${voucher.title}</h3>
        <p>${voucher.description}</p>
        <div class="voucher-points">${voucher.points_required} Points</div>
        <div class="voucher-actions">
          <button class="btn btn-primary ${!canRedeem ? 'disabled' : ''}" 
                  onclick="redeemVoucher('${voucher.id}', ${voucher.points_required})"
                  ${!canRedeem ? 'disabled' : ''}>
            <i class="fas fa-gift"></i> ${canRedeem ? 'Redeem' : 'Not Enough Points'}
          </button>
          <button class="btn btn-secondary" onclick="showQuantitySelector('${voucher.id}')">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function showQuantitySelector(voucherId) {
  const quantity = prompt("How many vouchers would you like to add? (Max: 10)", "1");
  if (quantity && !isNaN(quantity)) {
    const qty = Math.max(1, Math.min(parseInt(quantity), 10));
    addToCartWithQuantity(voucherId, qty);
  }
}
