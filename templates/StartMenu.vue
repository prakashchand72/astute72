<template>
    <div class="menu" style="z-index: 1000000">
    <div class="topbar">
       <h4> ASTUTE ≈)</h4>
    </div>
      <div class="socials">
        <a href="https://x.com/prakashchand72" target="_blank">
          <div class="bar">
            <img class="social-image" src="@/assets/iPhone-Icons/x.webp" />
            <u>T</u>witter
          </div>
        </a>
        <a href="https://medium.com/@prakashchand72" target="_blank">
          <div class="bar">
            <img class="social-image" src="@/assets/iPhone-Icons/medium.webp" />
            <u>M</u>edium Blogs
          </div>
        </a>
        <a href="https://discord.com/users/astute72" target="_blank">
          <div class="bar">
            <img class="social-image" src="@/assets/iPhone-Icons/discord.png" />
            <u>D</u>iscord
          </div>
        </a>
        <a
          href="https://www.linkedin.com/in/prakashchand72"
          target="_blank"
        >
          <div class="bar">
            <img class="social-image" src="@/assets/iPhone-Icons/Linkedin.webp" />
            <u>L</u>inkedIn
          </div>
        </a>
        <a href="https://github.com/prakashchand72" target="_blank">
          <div class="bar">
            <img class="social-image" src="@/assets/iPhone-Icons/github.png" />
            <u>G</u>itHub
          </div>
        </a>
        <div class="divider"></div>
        <a href="/files/Prakash_Chand_Resume.pdf" target="_blank">
          <div class="bar">
            <img class="social-image" src="@/assets/win95Icons/resume.png" />
            <u>R</u>esume
          </div>
        </a>
      </div>
    </div>
  </template>
  <style scoped>
  @font-face {
    font-family: 'Proto Mono';
    src: url('/assets/fonts/proto_mono_regular.ttf') format('truetype');
    font-weight: 700;
    }
  .menu {
    width: 175px;
    height: 360px;
    background: rgb(255, 255, 255);
    overflow: hidden;
    border-radius: 1%;
    border-top: solid #222222 2px;
    border-left: solid #222222 2px;
    border-right: solid rgb(90, 90, 90) 1.5px;
    border-bottom: solid rgb(90, 90, 90) 1.5px;
    box-shadow: 1.5px 1.5px black;
    max-height: 100%;
    max-width: 100%;
    align-items: flex-end;
    outline: rgb(222, 222, 222) 1px solid;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
    font-size: 12px;
  }
  
  .topbar {
    height: 30px;
    background-color: #cfcfcf;
    font-size: 14px;
    font-family: 'Ubuntu Mono', monospace;
    color:rgb(0, 136, 255);
    padding: 5px;
    width: 100%;
    border-bottom: solid rgb(90, 90, 90) 1.5px;
    text-align: left;
    }

  a {
    color: black;
    text-decoration: none;
  }
  
  @media only screen and (max-width: 600px) {
    .sidebar {
      width: 5px;
      background: rgb(123, 125, 123);
      height: 100%;
      width: 100%;
      display: flex;
      align-items: flex-end;
    }
  }
  
  .divider {
    width: 100%;
    height: 1px;
    background: rgb(8, 8, 8);
    border-bottom: rgb(0, 0, 0) solid 1px;
  }
  
  .socials {
    flex-grow: 3;
    width: 100%;
  }
  
  .social-image {
    width: 30px;
    height: 30px;
    margin-right: 10px;
    border-radius: 6px;
  }
  
  .bar {
    display: flex;
    flex-direction: row;
    padding: 5px 10px 5px 10px;
    align-items: center;
  }
  
  .bar:hover {
    background: #d9d9d9;
    color: #fc7a00;
  }
  </style>
  <script>
  export default {};
  </script>
  