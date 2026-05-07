/* ===========================================================
 * Shop – ซื้อไอเทมช่วยสอบ + เปลี่ยน Avatar
 * =========================================================== */
const {
  useState: useStateS
} = React;
const AVATARS = ["🐉", "🐯", "🐼", "🦊", "🦁", "🐺", "🦅", "🐲", "🦄", "👑", "🥷", "🧙", "⚔️", "🏆", "🌟"];
function renderAvatarPreview(avatar, fallback = "🐉", className = "h-[4.5rem] w-[4.5rem]") {
  if (U.isImageAvatar(avatar)) {
    return /*#__PURE__*/React.createElement("img", {
      src: avatar,
      alt: "avatar",
      className: `${className} rounded-2xl object-cover border border-white/20 shadow-lg`
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: `${className} flex items-center justify-center rounded-2xl bg-white/10 text-4xl`
  }, avatar || fallback);
}
window.Shop = function Shop({
  user,
  onBack,
  refresh
}) {
  const [u, setU] = useStateS(user);
  const [uploading, setUploading] = useStateS(false);
  const shopItems = window.SystemSettings?.getShopItems ? window.SystemSettings.getShopItems() : [];
  const buy = item => {
    if ((u.coins || 0) < item.cost) {
      U.toast("เหรียญไม่พอ", "warn");
      U.sfxWrong();
      return;
    }
    const newItems = {
      ...(u.items || {}),
      [item.key]: ((u.items || {})[item.key] || 0) + 1
    };
    const newU = AuthService.updateUser(u.studentId, {
      coins: u.coins - item.cost,
      items: newItems
    });
    setU(newU);
    refresh && refresh();
    U.toast(`ซื้อ ${item.emoji} ${item.name} แล้ว!`, "success");
    U.sfxLevelUp();
  };
  const setAvatar = a => {
    const newU = AuthService.updateUser(u.studentId, {
      avatar: a
    });
    setU(newU);
    refresh && refresh();
    U.toast(`เปลี่ยน Avatar เป็น ${a}`, "success");
  };
  const uploadAvatar = event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      U.toast("กรุณาเลือกไฟล์รูปภาพ", "warn");
      return;
    }
    if (file.size > 1024 * 1024) {
      U.toast("รูปต้องมีขนาดไม่เกิน 1 MB", "warn");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const newU = AuthService.updateUser(u.studentId, {
        avatar: result
      });
      setU(newU);
      refresh && refresh();
      setUploading(false);
      U.toast("อัปโหลดรูป Avatar สำเร็จ", "success");
    };
    reader.onerror = () => {
      setUploading(false);
      U.toast("อัปโหลดรูปไม่สำเร็จ", "error");
    };
    reader.readAsDataURL(file);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "scholar-shell arena-grid arena-noise min-h-screen text-[var(--arena-ink)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-4xl mx-auto p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "ghost-btn px-4 py-2 rounded-lg"
  }, "\u2190 \u0E01\u0E25\u0E31\u0E1A"), /*#__PURE__*/React.createElement("h1", {
    className: "page-heading text-2xl font-bold"
  }, "\uD83D\uDED2 \u0E23\u0E49\u0E32\u0E19\u0E04\u0E49\u0E32\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold text-[#9a6a18]"
  }, "\uD83E\uDE99 ", u.coins || 0)), /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-bold mb-3 mt-2"
  }, "\u2694\uFE0F \u0E44\u0E2D\u0E40\u0E17\u0E21\u0E0A\u0E48\u0E27\u0E22\u0E2A\u0E2D\u0E1A"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8"
  }, shopItems.map(it => {
    const owned = (u.items || {})[it.key] || 0;
    const canAfford = (u.coins || 0) >= it.cost;
    return /*#__PURE__*/React.createElement("div", {
      key: it.key,
      className: "group aspect-square"
    }, /*#__PURE__*/React.createElement("div", {
      className: "relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))] p-4 shadow-xl backdrop-blur transition duration-200 group-hover:scale-[1.02] group-hover:border-yellow-300/30"
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.12),transparent_35%),linear-gradient(145deg,transparent,rgba(14,165,233,0.06))]"
    }), /*#__PURE__*/React.createElement("div", {
      className: "relative flex items-start justify-between"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rounded-2xl bg-[rgba(92,57,46,.08)] px-3 py-2 text-3xl shadow-inner"
    }, it.emoji), /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-slate-950/40 px-2 py-1 text-right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] uppercase tracking-[0.2em] opacity-60"
    }, "Owned"), /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-black text-[#4f7f74]"
    }, owned))), /*#__PURE__*/React.createElement("div", {
      className: "relative mt-4 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold leading-tight"
    }, it.name), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-xs leading-5 text-[#6c5951]"
    }, it.desc)), /*#__PURE__*/React.createElement("div", {
      className: "relative mt-3 flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-[#98661b]"
    }, "\uD83E\uDE99 ", it.cost), /*#__PURE__*/React.createElement("button", {
      onClick: () => buy(it),
      disabled: !canAfford,
      className: `min-w-[84px] rounded-xl px-3 py-2 text-sm font-bold transition ${canAfford ? "jade-btn text-white hover:scale-105" : "bg-[#ece3d8] text-[#9c8c81]"}`
    }, "\u0E0B\u0E37\u0E49\u0E2D"))));
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-bold mb-3"
  }, "\uD83C\uDFAD \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19 Avatar (\u0E1F\u0E23\u0E35)"), /*#__PURE__*/React.createElement("div", {
    className: "arena-panel rounded-2xl p-4 border border-white/10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-4 flex flex-col items-center gap-3 rounded-[28px] border border-white/10 bg-slate-950/35 p-5 text-center"
  }, renderAvatarPreview(u.avatar || "🐉"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm uppercase tracking-[0.24em] text-[#4d7b70]"
  }, "Custom Avatar"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#756159]"
  }, "\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E39\u0E1B\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49 \u0E02\u0E19\u0E32\u0E14\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 1 MB")), /*#__PURE__*/React.createElement("label", {
    className: "jade-btn rounded-2xl px-5 py-3 font-bold cursor-pointer"
  }, uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูป Avatar", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    onChange: uploadAvatar,
    className: "hidden",
    disabled: uploading
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 justify-center"
  }, AVATARS.map(a => /*#__PURE__*/React.createElement("button", {
    key: a,
    onClick: () => setAvatar(a),
    className: `flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition ${u.avatar === a ? "bg-yellow-400/40 border-2 border-yellow-300" : "bg-white/5 hover:bg-white/15"}`
  }, a))))));
};