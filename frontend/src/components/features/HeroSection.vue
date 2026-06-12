<template>
  <section class="hero-part">
    <div class="hero-content">
      <h1 class="hero-title">Complexity<br />in time and<br />space</h1>
      <p class="hero-body">
        URBES Globe brings our research to life<br />through visualizations,
        open data, and<br />
        model simulations. Start exploring!
      </p>

      <div class="btn-row">
        <q-btn
          class="btn"
          href="https://www.epfl.ch/labs/urbes/"
          target="_blank"
          rel="noopener"
          unelevated
        >
          Visit URBES Lab
        </q-btn>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-part {
  padding: 20px 20px 28px;
  color: var(--color-text);
}

.hero-content {
  max-width: 550px;
}

.hero-body {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--color-text-muted);
  margin: 0;
}

.btn-row {
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
}

.btn {
  padding: 0.65rem 1rem;
  background: #e30613;
  color: #ffffff;
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

@media (min-width: 768px) {
  .hero-part {
    grid-row: 1;
    grid-column: 1;
    align-self: end;
    justify-self: start;
    width: 750px;
    max-width: 100%;
    padding: 1rem 2rem;
    pointer-events: none;
  }

  .hero-content {
    pointer-events: auto;
  }
  .hero-title {
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(2.5rem, 6vw, 3.75rem);
    line-height: 1.05;
    letter-spacing: 0.035em;
    text-transform: uppercase;
    margin: 0 0 1rem;
  }
  .hero-title {
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(2.5rem, 6vw, 3.75rem);
    line-height: 1.05;
    letter-spacing: 0.035em;
    text-transform: uppercase;
    margin: 0 0 1rem;
  }
}
</style>
