"use client";

import { useEffect, useState } from 'react';
import { FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import Social from '../../components/Social';
import { services as fallbackServices } from '../../helpers/servicesData';


const sectionVariants = {
    hidden: { opacity: 0, y: 24 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: 'easeOut' },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};


const info = [
    {
        icon: <FaPhoneAlt />,
        title: "Phone",
        description: "+880 1786 549 126",
    },
    {
        icon: <FaEnvelope />,
        title: "Email",
        description: "sazedulislam9126@gmail.com",
    },
    {
        icon: <FaMapMarkerAlt />,
        title: "Address",
        description: "Aftabnagar, Dhaka, Bangladesh",
    },
]

const Contact = () => {
    const [serviceOptions, setServiceOptions] = useState(fallbackServices ?? []);

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        service: '',
        message: '',
    });
    const [status, setStatus] = useState({ state: 'idle', message: '' });

    useEffect(() => {
        let active = true;

        async function loadServiceOptions() {
            try {
                const response = await fetch('/api/services', { cache: 'no-store' });
                const payload = await response.json();

                if (response.ok && Array.isArray(payload?.items) && payload.items.length > 0) {
                    if (active) {
                        setServiceOptions(payload.items);
                    }
                }
            } catch (error) {
                console.warn('Failed to load live service options, using fallback list:', error);
            }
        }

        loadServiceOptions();

        return () => {
            active = false;
        };
    }, []);

    const onChange = (key) => (e) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

    const validate = () => {
        if (!form.firstName.trim()) return 'Please enter your first name.';
        if (!form.email.trim()) return 'Please enter your email.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please enter a valid email.';
        if (!form.message.trim()) return 'Please enter a message.';
        return '';
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setStatus({ state: 'idle', message: '' });

        const error = validate();
        if (error) {
            setStatus({ state: 'error', message: error });
            return;
        }


        try {
            setStatus({ state: 'loading', message: 'Sending...' });

                // Save to our database API
                const dbResponse = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstName: form.firstName,
                        lastName: form.lastName,
                        email: form.email,
                        phone: form.phone,
                        service: form.service,
                        message: form.message,
                    }),
                });


                const dbData = await dbResponse.json();

                if (!dbResponse.ok) {
                    throw new Error(dbData?.error || 'Failed to save message');
            }

                setStatus({ state: 'success', message: 'Message sent successfully!' });
            setForm({ firstName: '', lastName: '', email: '', phone: '', service: '', message: '' });
        } catch (err) {
            setStatus({ state: 'error', message: err?.message || 'Something went wrong.' });
        }
    };

    return (
        <motion.section
            variants={sectionVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="relative overflow-hidden py-12 lg:py-14 bg-gradient-to-b from-[#06111c] via-[#071827] to-[#08121a]"
        >
            <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="mx-auto mb-8 max-w-2xl text-center">
                    <p className="text-sm uppercase tracking-[0.28em] text-accent/90">Get In Touch</p>
                    <h2 className="mt-3 text-3xl font-bold md:text-4xl">Let&apos;s build something useful</h2>
                    <p className="mt-3 text-white/65 leading-relaxed text-sm md:text-base">
                        If you have an idea, a product, or a backend challenge, send a message and I&apos;ll get back with a clear next step.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-start">
                    {/* form */}
                    <motion.div variants={itemVariants}>
                        <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-[#0c1826]/80 p-5 md:p-6 shadow-[0_16px_45px_rgba(2,6,23,0.45)] backdrop-blur-sm">
                            <div>
                                <h3 className="text-xl font-semibold text-white md:text-2xl">Start a conversation</h3>
                                <p className="mt-2 text-sm text-white/60">Share the scope, timeline, or the problem you want to solve.</p>
                            </div>

                            {/* input */}
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <Input
                                    name="firstName"
                                    type="text"
                                    placeholder="First name"
                                    value={form.firstName}
                                    onChange={onChange('firstName')}
                                    required
                                />
                                <Input
                                    name="lastName"
                                    type="text"
                                    placeholder="Last name"
                                    value={form.lastName}
                                    onChange={onChange('lastName')}
                                />
                                <Input
                                    name="email"
                                    type="email"
                                    placeholder="Email address"
                                    value={form.email}
                                    onChange={onChange('email')}
                                    required
                                />
                                <Input
                                    name="phone"
                                    type="tel"
                                    placeholder="Phone number"
                                    value={form.phone}
                                    onChange={onChange('phone')}
                                />
                            </div>

                            {/* select */}
                            <Select value={form.service} onValueChange={(value) => setForm((p) => ({ ...p, service: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a service" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>What do you need?</SelectLabel>
                                        {serviceOptions.map((service) => (
                                            <SelectItem key={service.id ?? service.num ?? service.title} value={service.title}>
                                                {service.title}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            {/* textarea */}
                            <Textarea
                                className="h-[170px] rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/35"
                                placeholder="Tell me a bit about your project, goals, timeline, and what you need help with..."
                                value={form.message}
                                onChange={onChange('message')}
                                required
                            />

                            {status.state !== 'idle' && (
                                <p
                                    className={
                                        status.state === 'success'
                                            ? 'text-green-400 text-sm'
                                            : status.state === 'error'
                                                ? 'text-red-400 text-sm'
                                                : 'text-white/60 text-sm'
                                    }
                                >
                                    {status.message}
                                </p>
                            )}

                            {/* button */}
                            <Button
                                size="md"
                                className="max-w-44 bg-gradient-to-r from-accent to-[#43c6ad] text-[#06111c] hover:opacity-95"
                                type="submit"
                                disabled={status.state === 'loading'}
                            >
                                {status.state === 'loading' ? 'Sending...' : 'Send message'}
                            </Button>
                        </form>
                    </motion.div>

                    {/* info */}
                    <motion.div variants={itemVariants} className='flex-1 flex items-start lg:justify-end mb-8 lg:mb-0'>
                        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c1826]/75 p-5 md:p-6 shadow-[0_16px_45px_rgba(2,6,23,0.45)] backdrop-blur-sm">
                            <div className="mb-5">
                                <p className="text-sm uppercase tracking-[0.24em] text-accent/90">Contact Details</p>
                                <h3 className="mt-2 text-xl font-semibold text-white">Prefer a direct line?</h3>
                                <p className="mt-2 text-sm text-white/60">Reach out using any of the options below. I usually reply quickly.</p>
                            </div>

                            <ul className='flex flex-col gap-4'>
                            {info.map((item, index) => {
                                return (
                                    <li key={index} className='flex items-center gap-4 rounded-2xl border border-white/8 bg-white/5 p-3.5 transition-transform duration-300 hover:-translate-y-0.5 hover:border-accent/25'>
                                        <div className='flex h-[48px] w-[48px] items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent'>
                                            <div className='text-[20px]'>{item.icon}</div>
                                        </div>
                                        <div className='flex-1 '>
                                            <p className='text-sm uppercase tracking-[0.14em] text-white/45'>{item.title}</p>
                                            <h3 className='text-sm md:text-base text-white/90 font-medium'>{item.description}</h3>
                                        </div>
                                    </li>
                                )
                            })}
                            </ul>

                            <div className="mt-6 border-t border-white/10 pt-5">
                                <p className="text-sm uppercase tracking-[0.18em] text-accent/90 mb-4">Connect</p>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.2 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Social
                                        containerStyles="flex flex-wrap gap-3"
                                        iconStyles="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:bg-accent hover:text-[#06111c]"
                                    />
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.section>
    );
};

export default Contact;