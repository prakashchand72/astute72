<script setup>
import { ref, onBeforeUnmount } from "vue";
import { useWindowsStore } from '@/stores/windows'

const windowsStore = useWindowsStore()

const date = ref("")
const time = ref("")
let clockTimer = null

const getImagePath = (iconImage) => {
    const path = `../assets/win95Icons/${iconImage}`;
    const modules = import.meta.glob("../assets/win95Icons/*", { eager: true });
    const mod = modules[path]
    if (mod == undefined) return ""
    return mod.default;
};

const openWindow = (windowId) => {
    const payload = { windowState: "open", windowId: windowId }
    windowsStore.setWindowState(payload)
}

const pad = (n) => String(n).padStart(2, "0")

const tick = () => {
    const now = new Date()
    let h = now.getHours()
    const ampm = h >= 12 ? "PM" : "AM"
    h = h % 12 || 12
    time.value = `${pad(h)}:${pad(now.getMinutes())} ${ampm}`
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    date.value = `${days[now.getDay()]} ${pad(now.getDate())} ${months[now.getMonth()]}`
}

onBeforeMount(() => {
    tick()
    clockTimer = setInterval(tick, 1000)
})

onBeforeUnmount(() => {
    if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
<nav class="navbar-container">
    <div alt="start" class="start-menu" v-on:click="windowsStore.setActiveWindow('Menu')" :class="
          windowsStore.activeWindow == 'Menu'
            ? 'start-menu-depressed'
            : 'start-menu'
        ">
        <div class="flex" :class="
            windowsStore.activeWindow == 'Menu'
                ? 'border-box'
                : 'container-border'
            ">
            <img class="start-icon" src="../assets/windows-95.png" />
            <button style="padding-left: 3px; font-size: 0.9rem; font-weight: bold">
                Start
            </button>
        </div>
    </div>
    <div class="overflow-x-scroll flex no-scrollbar">
    <div v-for="window in windowsStore.activeWindows" :key="window.key">
        <button v-if="
            windowsStore.activeWindow !== window.windowId &&
            (window.windowState == 'open' || window.windowState == 'minimize')
            " @click="openWindow(window.windowId)" class="navbar-item open">
            <img class="icon-image" :src=getImagePath(window.iconImage) :alt="window.altText" />
            <p>{{ window.displayName }}</p>
        </button>
        <button v-if="windowsStore.activeWindow == window.windowId" @click="openWindow(window.windowId)" class="navbar-item-depressed">
            <img class="icon-image" :src=getImagePath(window.iconImage) :alt="window.altText" />
            <p>{{ window.displayName }}</p>
        </button>
    </div>
    </div>
    <div class="spacer"></div>
    <div class="date" :title="date">
        {{ date }}
    </div>
    <div alt="time" class="time">
        <img src="../assets/speakers.png" class="icon-image" />
        <time>
            {{ time }}
        </time>
    </div>
</nav>
</template>

<style scoped>
@font-face {
  font-family: "Proto-Mono";
  src: url("@/assets/fonts/proto_mono_regular.ttf");
}

.navbar-container {
    width: 100%;
    height: 35px;
    background: rgb(192, 192, 192);
    border-top: solid rgb(250, 250, 250) 2px;
    z-index: 100;
    display: flex;
    flex-direction: row;
    align-items: center;
}

.navbar-item {
    width: 100px;
    height: 28px;
    border-radius: 10px;
    margin-left: 2px;
    margin-right: 2px;
    box-shadow: 1.5px 1.5px black;
    border-top: solid rgb(250, 250, 250) 1.5px;
    border-left: solid rgb(250, 250, 250) 1.5px;
    border-bottom: solid rgb(90, 90, 90) 1.5px;
    border-right: solid rgb(90, 90, 90) 1.5px;
    background: rgb(192, 192, 192);
    border-radius: 0.5px;
    display: flex;
    justify-content: flex-start;
    align-items: center !important;
    padding-left: 5px;
    padding-right: 5px;
    font-weight: bold;
    font-size: 0.7rem;
    padding-top: 2px;
}

.navbar-item:active {
    background: rgb(192, 192, 192);
    box-shadow: none;
    border-top: solid rgb(0, 0, 0) 1.5px;
    border-left: solid rgb(0, 0, 0) 1.5px;
    border-bottom: solid rgb(250, 250, 250) 1.5px;
    border-right: solid rgb(250, 250, 250) 1.5px;
}

.navbar-item:hover {
    cursor: pointer;
}

.navbar-item-depressed {
    width: 100px;
    height: 28px;
    border-radius: 10px;
    margin-left: 2px;
    margin-right: 2px;
    border-radius: 0.5px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding-left: 5px;
    padding-right: 5px;
    font-weight: bold;
    font-size: 0.7rem;
    background: rgb(192, 192, 192);
    box-shadow: none;
    background: repeating-conic-gradient(rgb(189, 190, 189) 0% 25%,
            rgb(255, 255, 255) 0% 50%) 50% / 2px 2px;
    border-top: solid rgb(0, 0, 0) 1.5px;
    border-left: solid rgb(0, 0, 0) 1.5px;
    border-bottom: solid rgb(250, 250, 250) 1.5px;
    border-right: solid rgb(250, 250, 250) 1.5px;
    padding-top: 2px;
}

.start-icon {
    width: 18px;
    height: 18px;
}

.start-menu {
    width: 65px;
    margin: 5px;
    height: 25px;
    box-shadow: 1.5px 1.5px black;
    font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
    border-top: solid rgb(250, 250, 250) 1.5px;
    border-left: solid rgb(250, 250, 250) 1.5px;
    border-bottom: solid rgb(90, 90, 90) 1.5px;
    border-right: solid rgb(90, 90, 90) 1.5px;
    background: rgb(192, 192, 192);
    display: flex !important;
    justify-content: center;
    align-items: center;
}

.start-menu:hover {
    cursor: pointer;
}

.start-menu:active {
    background: rgb(192, 192, 192);
    box-shadow: none;
    border-top: solid rgb(0, 0, 0) 1.5px;
    border-left: solid rgb(0, 0, 0) 1.5px;
    border-bottom: solid rgb(250, 250, 250) 1.5px;
    border-right: solid rgb(250, 250, 250) 1.5px;
}

.start-menu-depressed {
    box-shadow: none;
    background: repeating-conic-gradient(rgb(189, 190, 189) 0% 25%,
            rgb(255, 255, 255) 0% 50%) 50% / 2px 2px;
    border-top: solid rgb(0, 0, 0) 1.5px;
    border-left: solid rgb(0, 0, 0) 1.5px;
    border-bottom: solid rgb(250, 250, 250) 1.5px;
    border-right: solid rgb(250, 250, 250) 1.5px;
}

.container-border {
    display: flex;
    justify-content: center;
    align-items: center;
}

.border-box {
    display: flex;
    justify-content: center;
    align-items: center;
    border: black dotted 1px;
}

.icon-image {
    width: 15px;
    height: 15px;
    margin-right: 5px;
    margin-top: 0;
    margin-bottom: 0;
}

.spacer {
    flex-grow: 1;
}

.date {
    font-size: 0.6em;
    color: #000;
    margin-right: 6px;
    white-space: nowrap;
}

.time {
    width: 75px;
    margin: 5px;
    height: 25px;
    background: rgb(192, 192, 192);
    border-right: solid rgb(250, 250, 250) 1.5px;
    border-bottom: solid rgb(250, 250, 250) 1.5px;
    border-top: solid rgb(90, 90, 90) 1.5px;
    border-left: solid rgb(90, 90, 90) 1.5px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    font-size: 0.6em;
}

@media only screen and (max-width: 700px) {
    .time {
        width: auto !important;
        padding-left: 5px;
        padding-right: 5px;
        text-wrap: nowrap;
    }

    .date {
        display: none;
    }

    .icon-image {
        width: 0px;
        height: 0px;
        margin-right: 0px;
    }

    .navbar-item {
        width: auto;
        padding-top: 0;
    }

    .navbar-item-depressed {
        width: auto;
        padding-top: 0;
    }
}

button {
    background: none;
    color: inherit;
    border: none;
    font: inherit;
    outline: inherit;
}

p {
    margin: 0;
    padding: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
