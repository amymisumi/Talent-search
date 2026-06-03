const TalentMarquee = () => {
  const talentPhotos = [
    'https://media.istockphoto.com/id/1262964438/photo/success-happens-the-moment-you-believe-it-will.jpg?s=612x612&w=0&k=20&c=tpjbR4aaaiB43sneEWgatyFIQOmN3E-3nB5CBE5Idyg=',
    'https://media.istockphoto.com/id/1194465573/photo/portrait-of-smiling-african-american-woman.jpg?s=612x612&w=0&k=20&c=hD6As6gEFZobg44dhiHWkweVcKCv0NvPkk6XQChQKds=',
    'https://media.istockphoto.com/id/1299077582/photo/positivity-puts-you-in-a-position-of-power.jpg?s=612x612&w=0&k=20&c=baDuyrwRTscUZzyAqV44hnCq7d6tXUqwf26lJTcAE0A=',
    'https://media.istockphoto.com/id/2158303299/photo/studio-headshot-portrait-of-a-young-black-man.jpg?s=612x612&w=0&k=20&c=YtD8Bd4ptucVpQ8SyD0DPmE1Fx3JEJGn5BL5NnTHft0=',
    'https://media.istockphoto.com/id/1332295624/photo/i-got-this.jpg?s=612x612&w=0&k=20&c=avd7efxM3s80G_cVRQR4i5Kt9FLwZXbH3laBDi5ZS0w=',
    'https://media.istockphoto.com/id/171272361/photo/young-african-american-man-soccer-player.jpg?s=612x612&w=0&k=20&c=qRxLIyc8EFROkIjDe6KDN664Z-qmAoFuFnEvfFjt98g=',
    'https://media.istockphoto.com/id/143920409/photo/baseball-player.jpg?s=612x612&w=0&k=20&c=PpgxPvpLSlbkEsuRqjRNcFOiJjw4-p7qOSkLC7VBXB4=',
    'https://media.istockphoto.com/id/1422023484/photo/young-woman-using-the-mobile-phone-at-home.jpg?s=612x612&w=0&k=20&c=UuO1apep5uYk5hVHExJP9WtS0bcvbdqIIYpMuKD9wGw=',
  ];

  // Triple the photos so there's always enough to fill the screen at any width
  const photos = [...talentPhotos, ...talentPhotos, ...talentPhotos];

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4 mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-center">Our Talented Community</h2>
      </div>

      {/* Outer wrapper clips overflow and has fade edges */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div className="marquee-track flex items-center gap-6 w-max">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg hover:scale-110 transition-transform duration-300 cursor-pointer"
            >
              <img
                src={photo}
                alt={`Talent ${(index % talentPhotos.length) + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes marquee-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-33.3333%); }
          }
          .marquee-track {
            animation: marquee-scroll 30s linear infinite;
            will-change: transform;
          }
          .marquee-track:hover {
            animation-play-state: paused;
          }
          @media (max-width: 640px) {
            .marquee-track {
              animation-duration: 20s;
            }
          }
        `
      }} />
    </section>
  );
};

export default TalentMarquee;